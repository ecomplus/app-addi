const axios = require('axios')
module.exports = (accessToken, isSandbox) => {
  const headers = {
    'Content-Type': 'application/json'
  }
  let baseURL = `https://auth.addi${isSandbox ? '-staging-br.com' : '.com.br'}`

  if (accessToken) {
    console.log('> token ', accessToken)
    headers.Authorization = `Bearer ${accessToken}`
    baseURL = `https://api.addi${isSandbox ? '-staging-br.com' : '.com.br'}`
  }

  return axios.create({
    baseURL,
    headers
  })
}
