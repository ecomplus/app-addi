module.exports = (clientId, clientSecret, storeId, isSandbox) => new Promise((resolve, reject) => {
  //  https://api-docs.addi-staging-br.com/#/Authentication/createAuthToken
  const axios = require('./create-axios')(null, isSandbox)
  const request = isRetry => {
    console.log(`>> Create Auth s:${storeId}-Sandbox: ${isSandbox}`)
    axios.post('/oauth/token', {
      audience: 'https://api.addi.com.br',
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret
    })
      .then(({ data }) => resolve(data))
      .catch(err => {
        console.log('Deu erro', JSON.stringify(err))
        // console.log('Deu erro quero response status', err.response.status)
        if (!isRetry && err.response && err.response.status >= 429) {
          setTimeout(() => request(true), 7000)
        }
        reject(err)
      })
  }
  request()
})
