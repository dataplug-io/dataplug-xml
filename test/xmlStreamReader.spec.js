/* eslint-env node, mocha */
require('chai')
  .use(require('chai-as-promised'))
  .should()
const { PassThrough } = require('stream')
const logger = require('winston')
const { XmlStreamReader } = require('../lib')

logger.clear()

describe('XmlStreamReader', () => {
  it('transforms empty XML to null', (done) => {
    const reader = new XmlStreamReader()

    new Promise((resolve, reject) => {
      let data = []
      reader
        .on('end', () => {
          resolve(data)
        })
        .on('data', (chunk) => data.push(chunk))
        .on('error', reject)
    })
      .should.eventually.be.deep.equal([])
      .and.notify(done)
    reader.resume()

    reader.end()
  })

  it('transforms declaration-only XML to null', (done) => {
    const reader = new XmlStreamReader()

    new Promise((resolve, reject) => {
      let data = []
      reader
        .on('end', () => {
          resolve(data)
        })
        .on('data', (chunk) => data.push(chunk))
        .on('error', reject)
    })
      .should.eventually.be.deep.equal([])
      .and.notify(done)
    reader.resume()

    reader.write('<?xml version="1.0" encoding="UTF-8"?>')
    reader.end()
  })

  it('transforms incomplete XML to null', (done) => {
    const reader = new XmlStreamReader()

    new Promise((resolve, reject) => {
      let data = []
      reader
        .on('end', () => {
          resolve(data)
        })
        .on('data', (chunk) => data.push(chunk))
        .on('error', reject)
    })
      .should.eventually.be.deep.equal([])
      .and.notify(done)
    reader.resume()

    reader.write('<?xml version="1.0" encoding="UTF-8"?><root>')
    reader.end()
  })

  it('transforms empty XML array to null', (done) => {
    const reader = new XmlStreamReader()

    new Promise((resolve, reject) => {
      let data = []
      reader
        .on('end', () => {
          resolve(data)
        })
        .on('data', (chunk) => data.push(chunk))
        .on('error', reject)
    })
      .should.eventually.be.deep.equal([])
      .and.notify(done)
    reader.resume()

    reader.write('<root/>')
    reader.end()
  })

  it('transforms simple XML to object', (done) => {
    const reader = new XmlStreamReader()

    new Promise((resolve, reject) => {
      let data = []
      reader
        .on('end', () => {
          resolve(data)
        })
        .on('data', (chunk) => data.push(chunk))
        .on('error', reject)
    })
      .should.eventually.be.deep.equal([{property: 'value'}])
      .and.notify(done)
    reader.resume()

    reader.write('<?xml version="1.0" encoding="UTF-8"?><root><item property="value"/></root>')
    reader.end()
  })

  it('transforms complex XML to object', (done) => {
    const object = {
      attr: 'attrValue',
      subObject: {
        attr: 'attrValue'
      }
    }
    const reader = new XmlStreamReader()

    new Promise((resolve, reject) => {
      let data = []
      reader
        .on('end', () => {
          resolve(data)
        })
        .on('data', (chunk) => data.push(chunk))
        .on('error', reject)
    })
      .should.eventually.be.deep.equal([object])
      .and.notify(done)
    reader.resume()

    reader.write('<?xml version="1.0" encoding="UTF-8"?><root><item attr="attrValue"><subObject attr="attrValue"/></item></root>')
    reader.end()
  })

  it('supports chaining without data', (done) => {
    const sourceStream = new PassThrough()
    const reader = new XmlStreamReader()
    const targetStream = new PassThrough({ objectMode: true })

    new Promise((resolve, reject) => {
      let data = []
      targetStream
        .on('end', () => {
          resolve(data)
        })
        .on('data', (chunk) => data.push(chunk))
        .on('error', reject)
    })
      .should.eventually.be.deep.equal([])
      .and.notify(done)

    sourceStream
      .pipe(reader)
      .pipe(targetStream)
    sourceStream.end()
  })

  it('supports chaining with data', (done) => {
    const sourceStream = new PassThrough()
    const reader = new XmlStreamReader()
    const targetStream = new PassThrough({ objectMode: true })

    new Promise((resolve, reject) => {
      let data = []
      targetStream
        .on('end', () => resolve(data))
        .on('data', (chunk) => data.push(chunk))
        .on('error', reject)
    })
      .should.eventually.be.deep.equal([{property: 'value'}])
      .and.notify(done)

    sourceStream
      .pipe(reader)
      .pipe(targetStream)
    sourceStream.write('<?xml version="1.0" encoding="UTF-8"?><root><item property="value"/></root>')
    targetStream.resume()
    sourceStream.end()
  })

  it('supports "complete" event', (done) => {
    const reader = new XmlStreamReader('/*/item')
    new Promise((resolve, reject) => {
      reader
        .on('complete', resolve)
        .on('error', reject)
    })
      .should.eventually.be.equal('<root><notItem/></root>')
      .and.notify(done)
    reader.resume()

    reader.write('<?xml version="1.0" encoding="UTF-8"?><root><notItem/><item attr="attrValue"><subObject attr="attrValue"/></item></root>')
    reader.end()
  })

  it('handles bad XML', (done) => {
    const reader = new XmlStreamReader('/*/item')

    new Promise((resolve, reject) => {
      let data = []
      reader
        .on('end', () => resolve(data))
        .on('data', (chunk) => data.push(chunk))
        .on('error', reject)
    })
      .should.eventually.be.rejectedWith(/error/)
      .and.notify(done)
    reader.resume()

    reader.write('<?xml version="1.0" encoding="UTF-8"?>')
    reader.write('<root<root>>')
    reader.write('}<<<!')
    reader.write('<root/>')
    reader.end()
  })
})
