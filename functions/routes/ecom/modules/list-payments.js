const axios = require('axios')
exports.post = async ({ appSdk }, req, res) => {
  /**
   * Requests coming from Modules API have two object properties on body: `params` and `application`.
   * `application` is a copy of your app installed by the merchant,
   * including the properties `data` and `hidden_data` with admin settings configured values.
   * JSON Schema reference for the List Payments module objects:
   * `params`: https://apx-mods.e-com.plus/api/v1/list_payments/schema.json?store_id=100
   * `response`: https://apx-mods.e-com.plus/api/v1/list_payments/response_schema.json?store_id=100
   *
   * Examples in published apps:
   * https://github.com/ecomplus/app-pagarme/blob/master/functions/routes/ecom/modules/list-payments.js
   * https://github.com/ecomplus/app-custom-payment/blob/master/functions/routes/ecom/modules/list-payments.js
   */

  const { params, application } = req.body
  const { storeId } = req
  // setup basic required response object
  const response = {
    payment_gateways: []
  }

  const isSandbox = true // TODO: false
  console.log('> List Payment #', storeId, `${isSandbox ? '-isSandbox' : ''}`)

  // merge all app options configured by merchant
  const appData = Object.assign({}, application.data, application.hidden_data)

  if (!appData.client_id || !appData.client_secret) {
    return res.status(409).send({
      error: 'NO_ADDI_KEYS',
      message: 'Addi Client ID e/ou Client Secret da API indefinido(s) (lojista deve configurar o aplicativo)'
    })
  }

  const amount = params.amount || {}

  if (!appData.ally_slug) {
    return res.status(409).send({
      error: 'NO_ADDI_ALLY_SLUG',
      message: 'Addi Slug da conta indefinido (lojista deve configurar o aplicativo)'
    })
  }

  let url = `https://channels-public-api.addi${isSandbox ? '-staging-br.com' : '.com.br'}`
  url += `/allies/${appData.ally_slug}/config?requestedAmount=${amount.total}`

  let validatePaymentByAddi
  if (amount.total) {
    validatePaymentByAddi = (await axios.get(url)).data
    // console.log('>> ', validatePaymentByAddi)
  }

  // common payment methods data
  const intermediator = {
    name: 'Addi',
    link: 'https://api.addi.com.br',
    code: 'addi_app'
  }

  const { discount } = appData

  const listPaymentMethods = ['payment_link']
  // setup payment gateway object
  listPaymentMethods.forEach(paymentMethod => {
    const isLinkPayment = paymentMethod === 'payment_link'
    const minAmount = appData.min_amount || 1
    const maxAmount = appData.max_amount || 1
    const methodConfig = (appData[paymentMethod] || {})

    let validateAmount = false
    if (amount.total && (validatePaymentByAddi.minAmount && validatePaymentByAddi.maxAmount)) {
      validateAmount = (amount.total >= minAmount && amount.total <= maxAmount) &&
        (amount.total >= validatePaymentByAddi.minAmount &&
          amount.total <= validatePaymentByAddi.maxAmount)
    }

    // Workaround for showcase
    const validatePayment = amount.total ? validateAmount : true

    if (validatePayment) {
      const label = methodConfig.label || 'Link de Pagamento'

      const gateway = {
        label,
        icon: methodConfig.icon,
        text: methodConfig.text,
        payment_method: {
          code: isLinkPayment ? 'balance_on_intermediary' : paymentMethod,
          name: `${label} - ${intermediator.name} `
        },
        intermediator
      }
      if (discount && discount.value > 0 && (!amount.discount || discount.cumulative_discount !== false)) {
        gateway.discount = {
          apply_at: discount.apply_at,
          type: discount.type,
          value: discount.value
        }
        if (discount.apply_at !== 'freight') {
          // set as default discount option
          response.discount_option = {
            ...gateway.discount,
            label: `${label} `
          }
        }

        if (discount.min_amount) {
          // check amount value to apply discount
          if (amount.total < discount.min_amount) {
            delete gateway.discount
          }
          if (response.discount_option) {
            response.discount_option.min_amount = discount.min_amount
          }
        }
      }
      response.payment_gateways.push(gateway)
    }
  })

  res.send(response)
}
