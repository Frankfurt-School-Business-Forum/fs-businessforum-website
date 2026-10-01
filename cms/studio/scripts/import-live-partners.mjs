/** Run from cms/studio: npx sanity exec scripts/import-live-partners.mjs --with-user-token
 * One-time import from active production HTML. Does not overwrite existing records.
 * SHA-1 asset reuse and deterministic document IDs prevent duplicates on reruns.
 * Do not rerun after intentional deletion: missing approved records would be recreated.
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
const approved = {
  platinum: [['Deutsche Vermögensberatung (DVAG)', 'dvag'], ['Frankfurter Sparkasse', 'frankfurter-sparkasse']],
  gold: [['Unternehmen der Schwarz Gruppe', 'schwarz-gruppe']],
  silver: [['ODDO BHF', 'oddo-bhf']],
  corporate: [['Privatize', 'privatize']],
  event: [['GÖNRGY', 'goenrgy'], ['MBG', 'mbg'], ['Orthomol', 'orthomol'], ['Longines', 'longines'], ['Emmi Caffè Latte', 'emmi-caffe-latte'], ['Upsters', 'upsters']],
}
const attr = (node, name) => node?.attrs?.find((a) => a.name === name)?.value
const cls = (node, name) => (attr(node, 'class') || '').split(/\s+/).includes(name)
const text = (node) => node?.nodeName === '#text' ? node.value : (node?.childNodes || []).map(text).join('')
function all(node, predicate) { return [...(predicate(node) ? [node] : []), ...(node?.childNodes || []).flatMap((child) => all(child, predicate))] }
const one = (node, name) => all(node, (n) => cls(n, name))[0]
function portable(paragraphs) {
  assert(paragraphs.length, 'Missing paragraphs')
  return paragraphs.map((p, i) => {
    const block = {_type: 'block', _key: `p${i}`, style: 'normal', markDefs: [], children: []}
    function walk(node, marks = []) {
      if (node.nodeName === '#text') {
        if (node.value) block.children.push({_type: 'span', _key: `s${block.children.length}`, text: node.value, marks})
        return
      }
      assert(['p', 'strong', 'a'].includes(node.tagName), 'Unsupported rich text element')
      let next = marks
      if (node.tagName === 'strong') next = [...marks, 'strong']
      if (node.tagName === 'a') {
        const href = attr(node, 'href')
        assert(href && (/^https?:\/\//.test(href) || href.startsWith('#')), 'Unexpected link')
        const key = `link${block.markDefs.length}`
        block.markDefs.push({_type: 'link', _key: key, href})
        next = [...marks, key]
      }
      for (const child of node.childNodes || []) walk(child, next)
    }
    walk(p)
    assert.equal(block.children.map((s) => s.text).join(''), text(p), 'Rich text changed source text')
    return block
  })
}
async function main() {
  const tree = parse(await readFile(resolve(root, 'index.html'), 'utf8'))
  const section = all(tree, (n) => attr(n, 'id') === 'partners')[0]
  const marquee = all(tree, (n) => cls(n, 'lm-list') && attr(n, 'aria-hidden') !== 'true')[0]
  const hosts = all(one(tree, 'ws-hosts'), (n) => n.tagName === 'img').map((n) => attr(n, 'src'))
  const records = []
  for (const [category, expected] of Object.entries(approved)) {
    const tier = one(section, `ptier--${category}`)
    const cards = all(tier, (n) => cls(n, 'pcard'))
    assert.equal(cards.length, expected.length, 'Unexpected active card count')
    for (const [i, card] of cards.entries()) {
      const name = text(one(card, 'pname')).trim()
      assert.equal(name, expected[i][0], 'Unexpected active partner/order')
      const img = all(one(card, 'plogo'), (n) => n.tagName === 'img')[0]
      const path = attr(img, 'src')
      assert(path?.startsWith('assets/img/partners/'), 'Unexpected logo path')
      // Card logos are decorative (empty alt); use the exact standalone marquee alt.
      const standalone = all(marquee, (n) => n.tagName === 'img' && attr(n, 'src') === path)[0]
      assert(attr(standalone, 'alt')?.trim(), 'Missing source standalone alt')
      const record = {_id: `partner-${expected[i][1]}`, _type: 'partner', name, category, logoAlt: attr(standalone, 'alt'), sortOrder: i + 1, visible: true, workshopHost: hosts.includes(path)}
      let website = card.tagName === 'a' ? attr(card, 'href') : undefined
      if (cls(card, 'pcard--toggle')) {
        const panel = all(tier, (n) => attr(n, 'id') === attr(card, 'aria-controls'))[0]
        assert(panel, 'Missing detail panel')
        const de = all(panel, (n) => attr(n, 'data-lang') === 'de')[0]
        const en = all(panel, (n) => attr(n, 'data-lang') === 'en')[0]
        record.details = {
          _type: 'details',
          descriptionDe: portable(all(de, (n) => n.tagName === 'p')),
          descriptionEn: portable(all(en, (n) => n.tagName === 'p')),
          workshopHeading: text(one(panel, 'pdetail-workshop-k')),
          workshopText: portable([one(panel, 'pdetail-workshop-text')]),
        }
        website = attr(all(one(panel, 'pdetail-actions'), (n) => n.tagName === 'a')[0], 'href')
      }
      if (website) { assert(/^https?:\/\//.test(website)); record.websiteUrl = website }
      const absolute = resolve(root, path)
      assert(absolute.startsWith(resolve(root, 'assets') + '/'))
      const bytes = await readFile(absolute)
      records.push({record, path, bytes, sha1: createHash('sha1').update(bytes).digest('hex')})
    }
  }
  assert.equal(records.length, 11)
  assert.equal(records.filter(({record}) => record.workshopHost).length, 4)
  assert.equal(records.filter(({record}) => record.details).length, 1)
  const ids = records.map(({record}) => record._id)
  const existing = await client.fetch('*[_type == "partner" || _id in $ids || _id in $draftIds]', {ids, draftIds: ids.map((id) => `drafts.${id}`)})
  for (const {record} of records) {
    assert(!existing.some((d) => (d.name === record.name || d._id === `drafts.${record._id}`) && d._id !== record._id), `Alternate/draft record for ${record.name}; refusing import`)
    const old = existing.find((d) => d._id === record._id)
    if (old) {
      for (const [key, value] of Object.entries(record)) assert.deepEqual(old[key], value, `Existing ${record._id}.${key} differs; refusing overwrite`)
      if (!record.websiteUrl) assert(!old.websiteUrl, 'Existing URL differs')
    }
  }
  let uploaded = 0, reused = 0
  for (const entry of records) {
    let asset = await client.fetch('*[_type == "sanity.imageAsset" && sha1hash == $hash][0]{_id}', {hash: entry.sha1})
    if (asset) reused++
    else { asset = await client.assets.upload('image', entry.bytes, {filename: basename(entry.path), contentType: 'image/webp'}); uploaded++ }
    entry.record.logo = {_type: 'image', asset: {_type: 'reference', _ref: asset._id}}
    const old = existing.find((d) => d._id === entry.record._id)
    if (old) assert.equal(old.logo?.asset?._ref, asset._id, 'Existing logo differs; refusing overwrite')
  }
  let tx = client.transaction()
  for (const {record} of records) tx = tx.createIfNotExists(record)
  await tx.commit({visibility: 'sync'})
  const projection = '{_id,_type,name,category,logoAlt,websiteUrl,sortOrder,visible,workshopHost,details,logo,"logoHash":logo.asset->sha1hash}'
  const categories = Object.keys(approved)
  const groupedQuery = '{' + categories.map((category) => `"${category}": *[_type == "partner" && visible == true && category == "${category}"] | order(sortOrder asc, name asc, _id asc)${projection}`).join(',') + ',"total":count(*[_type == "partner" && visible == true])}'
  const grouped = await client.withConfig({perspective: 'published'}).fetch(groupedQuery)
  assert.equal(grouped.total, 11)
  for (const category of categories) {
    const source = records.filter(({record}) => record.category === category)
    assert.deepEqual(grouped[category].map((d) => d._id), source.map(({record}) => record._id))
    grouped[category].forEach((doc, i) => {
      for (const [key, value] of Object.entries(source[i].record)) assert.deepEqual(doc[key], value, `Verification failed: ${doc._id}.${key}`)
      assert.equal(doc.logoHash, source[i].sha1)
      if (!source[i].record.websiteUrl) assert.equal(doc.websiteUrl, null)
    })
  }
  console.log(JSON.stringify({uploaded,reused,schwarzDetails:'Exact Portable Text, text, bold marks, workshop heading and link verified',workshopHosts:records.filter(({record}) => record.workshopHost).map(({record}) => record._id),groups:Object.fromEntries(categories.map((c) => [c,grouped[c].map((d) => ({id:d._id,order:d.sortOrder,url:d.websiteUrl,logoAlt:d.logoAlt}))]))},null,2))
}
main().catch((error) => { console.error(error.message); process.exitCode = 1 })
