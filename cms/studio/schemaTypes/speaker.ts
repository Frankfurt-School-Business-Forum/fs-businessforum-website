import {defineField, defineType} from 'sanity'

export const speaker = defineType({
  name: 'speaker',
  title: 'Speaker',
  type: 'document',
  fields: [
    defineField({
      name: 'name', title: 'Name', type: 'string',
      validation: (rule) => rule.required().custom((value) => Boolean(value?.trim()) || 'Enter a name.'),
    }),
    defineField({
      name: 'role', title: 'Role', type: 'string',
      validation: (rule) => rule.required().custom((value) => Boolean(value?.trim()) || 'Enter a role.'),
    }),
    defineField({
      name: 'companyName', title: 'Company Name', type: 'string',
      validation: (rule) => rule.required().custom((value) => Boolean(value?.trim()) || 'Enter a company name.'),
    }),
    defineField({name: 'companySuffix', title: 'Company Suffix', type: 'string'}),
    defineField({
      name: 'companyLanguage', title: 'Company Language', type: 'string',
      description: 'Language tag for the company name, for example de, en-GB, or zh-Hant.',
      validation: (rule) => rule.custom((value) => {
        if (value === undefined) return true
        try {
          return Intl.getCanonicalLocales(value).length === 1 || 'Enter a valid language tag.'
        } catch {
          return 'Enter a valid language tag, such as de or en-GB.'
        }
      }),
    }),
    defineField({
      name: 'portrait', title: 'Portrait', type: 'image',
      validation: (rule) => rule.required().assetRequired(),
    }),
    defineField({
      name: 'portraitAlt', title: 'Portrait Alt Text', type: 'string',
      validation: (rule) => rule.required().custom((value) => Boolean(value?.trim()) || 'Describe the portrait.'),
    }),
    defineField({
      name: 'companyLogo', title: 'Company Logo', type: 'image',
      validation: (rule) => rule.assetRequired(),
    }),
    defineField({
      name: 'companyLogoAlt', title: 'Company Logo Alt Text', type: 'string',
      validation: (rule) => rule.custom((value, context) => !context.document?.companyLogo
        || Boolean(value?.trim()) || 'Describe the company logo when one is supplied.'),
    }),
    defineField({
      name: 'sortOrder', title: 'Sort Order', type: 'number',
      validation: (rule) => rule.required().integer().min(0),
    }),
    defineField({
      name: 'visible', title: 'Visible', type: 'boolean', initialValue: false,
      description: 'Controls homepage display only. Published documents are publicly readable even when hidden. Keep future or confidential speakers as unpublished drafts.',
      validation: (rule) => rule.required(),
    }),
  ],
})
