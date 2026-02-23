import nock from 'nock'
import request from 'supertest'

import { curlify } from './'

describe('curlify', () => {
  it('Should parse the request', async () => {
    nock('http://api.something.com')
      .post('/')
      .reply(201, {
        license: {
          key: 'mit',
          name: 'MIT License',
          spdx_id: 'MIT',
          url: 'https://api.github.com/licenses/mit',
        },
      })

    const response = await request('http://api.something.com')
      .post('/')
      .send({})
      .expect(201)

    const returned = curlify(response)

    expect(returned).toBe('curl -X POST http://api.something.com/')
  });

  it('Should parse the request with body', async () => {
    nock('http://api.something.com')
      .post('/')
      .reply(201, { ok: true })

    const response = await request('http://api.something.com')
      .post('/')
      .send({ foo: 'bar' })
      .expect(201)

    const returned = curlify(response)

    expect(returned).toBe("curl -X POST http://api.something.com/ \\\n\t-d '{\"foo\":\"bar\"}' \\\n\t-H \"Content-Type: application/json\"")
  });
});
