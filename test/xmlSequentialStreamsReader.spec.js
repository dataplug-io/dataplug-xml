/* eslint-env node, mocha */
require('chai')
  .use(require('chai-as-promised'))
  .should()
const { PassThrough } = require('stream')
const { XmlSequentialStreamsReader } = require('../lib')
const Promise = require('bluebird')

describe('XmlSequentialStreamsReader', () => {
  it('should transform XML to object', () => {
    const object = {
      attr: 'attrValue',
      subObject: {
        attr: 'attrValue'
      }
    }

    const promise = new Promise((resolve, reject) => {
      let passThrough = new PassThrough()
      const reader = new XmlSequentialStreamsReader(async () => {
        const inputStream = passThrough
        passThrough = null
        return inputStream
      }, {}, '/*/item')
      passThrough.write('<?xml version="1.0" encoding="UTF-8"?><root><notItem/><item attr="attrValue"><subObject attr="attrValue"/></item></root>')
      reader
        .on('error', reject)
        .on('data', resolve)
    })
    promise.should.eventually.be.deep.equal(object)
  })
})
