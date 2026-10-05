/** One-time production import. Run from cms/studio:
 * npx sanity exec scripts/import-live-speakers.mjs --with-user-token
 * Reads active homepage cards only. Existing documents are never overwritten.
 * Asset SHA-1 lookup and deterministic document IDs make reruns duplicate-safe.
 * Do not rerun after intentionally deleting these speakers (it would recreate them).
 */
import {readFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {resolve, basename} from 'node:path'
import {fileURLToPath} from 'node:url'
import {parse} from 'parse5'
import {getCliClient} from 'sanity/cli'
import assert from 'node:assert/strict'

const root = fileURLToPath(new URL('../../../', import.meta.url))
const client = getCliClient({apiVersion: '2025-02-19'}).withConfig({projectId: '0kh5rd3y', dataset: 'production', useCdn: false})
const expected = [
  ['Rainer Neske', 'speaker-rainer-neske'],
  ['Stefan Wintels', 'speaker-stefan-wintels'],
  ['Stefan Rühl', 'speaker-stefan-ruehl'],
  ['Carsten Brzeski', 'speaker-carsten-brzeski'],
]
const attr = (node, name) => node?.attrs?.find((a) => a.name === name)?.value
const hasClass = (node, cls) => (attr(node, 'class') || '').split(/\s+/).includes(cls)
const content = (node) => node?.nodeName === '#text' ? node.value : (node?.childNodes || []).map(content).join('')
function findAll(node, predicate) {
  return [...(predicate(node) ? [node] : []), ...(node.childNodes || []).flatMap((child) => findAll(child, predicate))]
}
const byClass = (node, cls) => findAll(node, (n) => hasClass(n, cls))[0]

async function main() {
  const tree = parse(await readFile(resolve(root, 'index.html'), 'utf8'))
  const grid = byClass(tree, 'spk-grid')
  assert(grid, 'Missing live speaker grid')
  // parse5 treats commented future records as comments, never HTML elements.
  const cards = findAll(grid, (n) => n.tagName === 'article' && hasClass(n, 'spk-card'))
  assert.equal(cards.length, 4, 'Expected exactly four active cards')
  const records = await Promise.all(cards.map(async (card, i) => {
    const name = content(byClass(card, 'spk-name')).trim()
    assert.equal(name, expected[i][0], 'Unexpected active speaker or order')
    const company = byClass(card, 'spk-company')
    const languageNode = findAll(company, (n) => Boolean(attr(n, 'lang')))[0]
    const portrait = findAll(byClass(card, 'spk-photo'), (n) => n.tagName === 'img')[0]
    const logo = findAll(byClass(card, 'spk-logo'), (n) => n.tagName === 'img')[0]
    const record = {
      _id: expected[i][1], _type: 'speaker', name,
      role: content(byClass(card, 'spk-role')).trim(),
      companyName: content(languageNode || company).trim(),
      portraitAlt: attr(portrait, 'alt'), companyLogoAlt: attr(logo, 'alt'),
      sortOrder: i + 1, visible: true,
    }
    if (languageNode) {
      record.companyLanguage = attr(languageNode, 'lang')
      record.companySuffix = content(company).trim().slice(record.companyName.length).trim()
    }
    const assets = await Promise.all([portrait, logo].map(async (image) => {
      const path = attr(image, 'src')
      assert(path?.startsWith('assets/'), 'Expected local asset')
      const absolute = resolve(root, path)
      assert(absolute.startsWith(resolve(root, 'assets') + '/'), 'Asset outside source assets')
      const bytes = await readFile(absolute)
      return {path, bytes, sha1: createHash('sha1').update(bytes).digest('hex')}
    }))
    return {record, assets}
  }))
  const ids = expected.map(([, id]) => id)
  const existing = await client.fetch('*[_type == "speaker" || _id in $ids || _id in $draftIds]', {ids, draftIds: ids.map((id) => `drafts.${id}`)})
  for (const {record} of records) {
    assert(!existing.some((doc) => doc.name === record.name && doc._id !== record._id), `Existing alternate/draft record for ${record.name}; resolve before importing`)
    const old = existing.find((doc) => doc._id === record._id)
    if (old) for (const [key, value] of Object.entries(record)) assert.deepEqual(old[key], value, `Existing ${record._id}.${key} differs; refusing overwrite`)
  }
  let uploaded = 0, reused = 0
  for (const {record, assets} of records) {
    for (const [i, asset] of assets.entries()) {
      let remote = await client.fetch('*[_type == "sanity.imageAsset" && sha1hash == $hash][0]{_id}', {hash: asset.sha1})
      if (remote) reused++
      else { remote = await client.assets.upload('image', asset.bytes, {filename: basename(asset.path), contentType: 'image/webp'}); uploaded++ }
      record[i === 0 ? 'portrait' : 'companyLogo'] = {_type: 'image', asset: {_type: 'reference', _ref: remote._id}}
      const old = existing.find((doc) => doc._id === record._id)
      if (old) assert.equal(old[i === 0 ? 'portrait' : 'companyLogo']?.asset?._ref, remote._id, 'Existing asset differs; refusing overwrite')
    }
  }
  let transaction = client.transaction()
  for (const {record} of records) transaction = transaction.createIfNotExists(record)
  await transaction.commit({visibility: 'sync'})
  const visible = await client.withConfig({perspective: 'published'}).fetch('*[_type == "speaker" && visible == true] | order(sortOrder asc, name asc, _id asc){_id,name,role,companyName,companySuffix,companyLanguage,portraitAlt,companyLogoAlt,sortOrder,visible,"portraitRef":portrait.asset._ref,"logoRef":companyLogo.asset._ref,"portraitHash":portrait.asset->sha1hash,"logoHash":companyLogo.asset->sha1hash}')
  assert.deepEqual(visible.map((doc) => doc._id), ids, 'Published visible speakers differ from the four approved records')
  visible.forEach((doc, i) => {
    const {record, assets} = records[i]
    for (const [key, value] of Object.entries(record)) if (!['_type', 'portrait', 'companyLogo'].includes(key)) assert.deepEqual(doc[key], value)
    assert.equal(doc.portraitHash, assets[0].sha1)
    assert.equal(doc.logoHash, assets[1].sha1)
  })
  console.log(JSON.stringify({uploaded, reused, verified: visible}, null, 2))
}
main().catch((error) => { console.error(error.message); process.exitCode = 1 })
