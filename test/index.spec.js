/* eslint-env node, mocha */
require('chai')
  .should()
const dataplugXml = require('../lib')

describe('dataplug-xml', () => {
  it('should have "deserializeFromXml" function', () => {
    dataplugXml
      .should.have.property('deserializeFromXml')
      .that.is.an('function')
  })

  it('should have "serializeToXml" function', () => {
    dataplugXml
      .should.have.property('serializeToXml')
      .that.is.an('function')
  })

  it('should have "XmlSequentialStreamsReader" class', () => {
    dataplugXml
      .should.have.property('XmlSequentialStreamsReader')
      .that.is.an('function')
  })

  it('should have "XmlStreamReader" class', () => {
    dataplugXml
      .should.have.property('XmlStreamReader')
      .that.is.an('function')
  })

  it('should have "XmlStreamWriter" class', () => {
    dataplugXml
      .should.have.property('XmlStreamWriter')
      .that.is.an('function')
  })
})
