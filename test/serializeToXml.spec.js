/* eslint-env node, mocha */
require('chai')
  .should()
const { serializeToXml } = require('../lib')

describe('#serializeToXml()', () => {
  describe('characters escaping', () => {
    it("'\"' to '&quot;'", () => {
      serializeToXml('"')
        .should.be.equal('&quot;')
    })

    it("'&': '&amp;'", () => {
      serializeToXml('&')
        .should.be.equal('&amp;')
    })

    it("''': '&apos;'", () => {
      serializeToXml('\'')
        .should.be.equal('&apos;')
    })

    it("'<': '&lt;'", () => {
      serializeToXml('<')
        .should.be.equal('&lt;')
    })

    it("'>': '&gt;'", () => {
      serializeToXml('>')
        .should.be.equal('&gt;')
    })
  })

  it('transforms empty object to XML without declaration (by default)', () => {
    serializeToXml({}, 'object')
      .should.be.equal('<object/>')
  })

  it('transforms empty object to XML with declaration', () => {
    serializeToXml({}, 'object', { declaration: true })
      .should.be.equal('<?xml version="1.0" encoding="UTF-8"?><object/>')
  })

  it('transforms empty object to XML without declaration (explicitly)', () => {
    serializeToXml({}, 'object', { declaration: false })
      .should.be.equal('<object/>')
  })

  it('transforms empty object to XML with custom declaration', () => {
    serializeToXml({}, 'object', { declaration: { custom: 'yes' } })
      .should.be.equal('<?xml version="1.0" encoding="UTF-8" custom="yes"?><object/>')
  })

  it('transforms object with simple property to XML', () => {
    serializeToXml({ property: 'value' }, 'object')
      .should.be.equal('<object property="value"/>')
  })

  it('transforms object with empty object property to XML', () => {
    serializeToXml({ property: {} }, 'object')
      .should.be.equal('<object><property/></object>')
  })

  it('transforms object with empty array property to XML', () => {
    serializeToXml({ property: [] }, 'object')
      .should.be.equal('<object></object>')
  })

  it('transforms object with 2-item array property to XML', () => {
    serializeToXml({ property: [ {}, {} ] }, 'object')
      .should.be.equal('<object><property/><property/></object>')
  })
})
