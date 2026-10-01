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
          validation: (rule) => rule.required().min(1),
        }),
        defineField({
          name: 'descriptionEn', title: 'Description (English)', type: 'array', of: [paragraph],
          validation: (rule) => rule.required().min(1),
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
