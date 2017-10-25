/* eslint-env node, mocha */
require('chai')
  .should()
const { deserializeFromXml } = require('../lib')

describe('#deserializeFromXml()', () => {
  it('transforms empty XML without declaration to an object', () => {
    deserializeFromXml('<object/>')
      .should.be.deep.equal([{}, 'object'])
  })

  it('transforms empty XML (with prefix) without declaration to an object', () => {
    deserializeFromXml('<prefix:object/>')
      .should.be.deep.equal([{}, 'prefix:object'])
  })

  it('transforms empty XML with declaration to an object', () => {
    deserializeFromXml('<?xml version="1.0" encoding="UTF-8"?><object/>')
      .should.be.deep.equal([{}, 'object'])
  })

  it('transforms XML with single attribute to an object', () => {
    deserializeFromXml('<object property="value"/>')
      .should.be.deep.equal([{ property: 'value' }, 'object'])
  })

  it('transforms XML with single child to an object', () => {
    deserializeFromXml('<object><property/></object>')
      .should.be.deep.equal([{ property: {} }, 'object'])
  })

  it('transforms XML with 3 empty children to an object', () => {
    deserializeFromXml('<object><property/><property/><property/></object>')
      .should.be.deep.equal([{ property: [{}, {}, {}] }, 'object'])
  })
})
