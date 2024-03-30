import { faker } from '@faker-js/faker';
import axios from 'axios'

import { curlify } from './'

describe('curlify', () => {
  it('Should parse the request', async () => {
    const response = await axios.get('https://google.com.br')
    const curl = curlify(response.config as unknown as Request)
    response.config.headers
    expect(curl).toBeInstanceOf(String)
  });
});
