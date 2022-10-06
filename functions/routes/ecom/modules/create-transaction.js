const ecomUtils = require('@ecomplus/utils')

exports.post = ({ appSdk, admin }, req, res) => {
  /**
   * Requests coming from Modules API have two object properties on body: `params` and `application`.
   * `application` is a copy of your app installed by the merchant,
   * including the properties `data` and `hidden_data` with admin settings configured values.
   * JSON Schema reference for the Create Transaction module objects:
   * `params`: https://apx-mods.e-com.plus/api/v1/create_transaction/schema.json?store_id=100
   * `response`: https://apx-mods.e-com.plus/api/v1/create_transaction/response_schema.json?store_id=100
   *
   * Examples in published apps:
   * https://github.com/ecomplus/app-pagarme/blob/master/functions/routes/ecom/modules/create-transaction.js
   * https://github.com/ecomplus/app-custom-payment/blob/master/functions/routes/ecom/modules/create-transaction.js
   */

  const { params, application } = req.body
  const { storeId } = req
  // merge all app options configured by merchant
  const appData = Object.assign({}, application.data, application.hidden_data)
  // setup required `transaction` response object
  const orderId = params.order_id
  const { amount, buyer, payer, to, items } = params
  console.log('> Transaction #', storeId, orderId)
  const finalAmount = amount.total
  const finalFreight = amount.freight
  let addiTransaction
  addiTransaction = {
    orderId,
    totalAmount: Math.floor(finalAmount * 100),
    shippingAmount: Math.floor(finalFreight * 100) || 0,
    currency: params.currency_id || 'BRL'
  }
  addiTransaction.items = []
  items.forEach(item => {
    if (item.quantity > 0) {
      addiTransaction.items.push({
        sku: item.sku,
        name: item.name || item.sku,
        unitPrice: Math.floor((item.final_price || item.price) * 100),
        quantity: item.quantity
      })
    }
  })
  addiTransaction.client = {
    idType: buyer.registry_type === 'j' ? 'CNPJ' : 'CPF',
    idNumber: String(buyer.doc_number),
    firstName: buyer.fullname.replace(/\s.*/, ''),
    lastName: buyer.fullname.replace(/[^\s]+\s/, ''),
    email: buyer.email,
    cellphone: buyer.phone.number,
    cellphoneCountryCode: `+${(buyer.phone.country_code || '55')}`,
    address: {
      /* lineOne: cr 48 156 25 25,
      city: Sao Paulo,
      country: BR */
    }
  }



  // indicates whether the buyer should be redirected to payment link right after checkout
  let redirectToPayment = false

  /**
   * Do the stuff here, call external web service or just fill the `transaction` object
   * according to the `appData` configured options for the chosen payment method.
   */

  // WIP:
  switch (params.payment_method.code) {
    case 'credit_card':
      // you may need to handle card hash and create transaction on gateway API
      break
    case 'banking_billet':
      // create new "Boleto bancário"
      break
    case 'online_debit':
      redirectToPayment = true
      break
    default:
      break
  }

  res.send({
    redirect_to_payment: redirectToPayment,
    transaction
  })
}
