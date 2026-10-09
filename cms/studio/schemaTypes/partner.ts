import {defineArrayMember, defineField, defineType} from 'sanity'

const paragraph = defineArrayMember({
  type: 'block',
  styles: [{title: 'Paragraph', value: 'normal'}],
  lists: [],
  marks: {
    decorators: [{title: 'Bold', value: 'strong'}],
    annotations: [
      defineField({
        name: 'link', title: 'Link', type: 'object',
        fields: [defineField({
          name: 'href', title: 'URL', type: 'url',
          validation: (rule) => rule.required().uri({scheme: ['http', 'https'], allowRelative: true}),
        })],
      }),
    ],
  },
})

// Supplied company languages require readable text, but never require a translation.
function validateDescription(value: unknown) {
  if (value === undefined || value === null) return true
  if (!Array.isArray(value)) return 'Enter meaningful company text or remove this language.'
  const valid = value.every((block) => block && block._type === 'block'
    && block.style === 'normal' && !block.listItem && Array.isArray(block.children)
    && block.children.every((span: {_type?: string; text?: unknown; marks?: unknown} | null) =>
      span && span._type === 'span' && typeof span.text === 'string' && Array.isArray(span.marks)))
  return (valid && value.some((block) => block.children.some((span: {text: string}) => span.text.trim())))
    || 'Enter meaningful company text or remove this language.'
}

const categories = ['platinum', 'gold', 'silver', 'corporate', 'event']

export const partner = defineType({
  name: 'partner', title: 'Partner', type: 'document',
  fields: [
    defineField({
      name: 'name', type: 'string',
      validation: (rule) => rule.required().custom((value) => Boolean(value?.trim()) || 'Enter a name.'),
    }),
    defineField({
      name: 'category', type: 'string', options: {list: categories},
      validation: (rule) => rule.required().custom((value) => Boolean(value && categories.includes(value)) || 'Choose a listed category.'),
    }),
    defineField({
      name: 'logo', type: 'image',
      validation: (rule) => rule.required().assetRequired(),
    }),
    defineField({
      name: 'logoAlt', title: 'Logo Alt Text', type: 'string',
      validation: (rule) => rule.required().custom((value) => Boolean(value?.trim()) || 'Describe the logo.'),
    }),
    defineField({
      name: 'websiteUrl', title: 'Website URL', type: 'url',
      validation: (rule) => rule.uri({scheme: ['http', 'https']}),
    }),
    defineField({
      name: 'sortOrder', title: 'Sort Order', type: 'number',
      validation: (rule) => rule.required().integer().min(0),
    }),
    defineField({
      name: 'visible', type: 'boolean', initialValue: false,
      description: 'Controls website display only. Published content is public even when hidden. Keep future or confidential partners as unpublished drafts.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'workshopHost', title: 'Workshop Host', type: 'boolean', initialValue: false,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'details', type: 'object',
      fields: [
        defineField({
          name: 'descriptionDe', title: 'Description (German)', type: 'array', of: [paragraph],
          validation: (rule) => rule.custom(validateDescription),
        }),
        defineField({
          name: 'descriptionEn', title: 'Description (English)', type: 'array', of: [paragraph],
          validation: (rule) => rule.custom(validateDescription),
        }),
        defineField({
          name: 'workshopHeading', title: 'Workshop Heading', type: 'string',
          validation: (rule) => rule.custom((value, context) => {
            const parent = context.parent as {workshopText?: unknown} | undefined
            return parent?.workshopText === undefined || Boolean(value?.trim())
              || 'Enter a heading when workshop text is supplied.'
          }),
        }),
        defineField({
          name: 'workshopText', title: 'Workshop Text', type: 'array', of: [paragraph],
        }),
      ],
    }),
  ],
})
