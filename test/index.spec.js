/* eslint-env node, mocha */
require('chai')
  .should()
const dataplugXml = require('../lib')

describe('dataplug-xml', () => {
  it('has "deserializeFromXml" function', () => {
    dataplugXml
      .should.have.property('deserializeFromXml')
      .that.is.an('function')
  })

  it('has "serializeToXml" function', () => {
    dataplugXml
      .should.have.property('serializeToXml')
      .that.is.an('function')
  })

  it('has "XmlStreamReader" class', () => {
    dataplugXml
      .should.have.property('XmlStreamReader')
      .that.is.an('function')
  })

  it('has "XmlStreamWriter" class', () => {
    dataplugXml
      .should.have.property('XmlStreamWriter')
      .that.is.an('function')
  })
})
