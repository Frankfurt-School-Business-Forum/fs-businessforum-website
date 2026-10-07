import {defineField, defineType} from 'sanity'

const timezoneGuidance =
  'Use the intended Europe/Berlin time (CET/CEST) and check the timezone shown in the editor. Sanity stores UTC; imported datetimes must include Z or an explicit offset.'

function validDatetime(value: unknown): value is string {
  return typeof value === 'string'
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/i.test(value)
    && Number.isFinite(Date.parse(value))
}

export const eventSettings = defineType({
  name: 'eventSettings',
  title: 'Event Settings',
  type: 'document',
  fields: [
    defineField({
      name: 'eventName', title: 'Event Name', type: 'string',
      validation: (rule) => rule.required().custom((value) => Boolean(value?.trim()) || 'Enter an event name.'),
    }),
    defineField({
      name: 'eventStartDate', title: 'Event Start Date', type: 'datetime',
      description: timezoneGuidance,
      validation: (rule) => rule.required().custom((value) => validDatetime(value) || 'Enter a valid datetime with a timezone.'),
    }),
    defineField({
      name: 'eventEndDate', title: 'Event End Date', type: 'datetime',
      description: timezoneGuidance,
      validation: (rule) => rule.required().custom((value, context) => {
        if (!validDatetime(value)) return 'Enter a valid datetime with a timezone.'
        const start = context.document?.eventStartDate
        return !validDatetime(start) || Date.parse(value) >= Date.parse(start)
          || 'The event end must be on or after its start.'
      }),
    }),
    defineField({
      name: 'eventVenue', title: 'Event Venue', type: 'string',
      validation: (rule) => rule.required().custom((value) => Boolean(value?.trim()) || 'Enter a venue.'),
    }),
    defineField({
      name: 'eventCity', title: 'Event City', type: 'string',
      validation: (rule) => rule.required().custom((value) => Boolean(value?.trim()) || 'Enter a city.'),
    }),
    defineField({
      name: 'countdownEnabled', title: 'Countdown Enabled', type: 'boolean', initialValue: false,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'countdownHeading', title: 'Countdown Heading', type: 'string',
      initialValue: 'More to be announced',
      validation: (rule) => rule.custom((value, context) => context.document?.countdownEnabled !== true
        || Boolean(value?.trim()) || 'Enter a heading when the countdown is enabled.'),
    }),
    defineField({
      name: 'countdownLabel', title: 'Countdown Label', type: 'string',
      initialValue: 'Next speakers in',
      validation: (rule) => rule.custom((value, context) => context.document?.countdownEnabled !== true
        || Boolean(value?.trim()) || 'Enter a label when the countdown is enabled.'),
    }),
    //defineField({
      //name: 'countdownTitle', title: 'Countdown Title', type: 'string',
      //deprecated: {reason: 'Use countdownHeading and countdownLabel. This legacy field is no longer required or used.'},
      //readOnly: true,
      //hidden: ({value}) => value === undefined,
    //}),
    defineField({
      name: 'countdownTarget', title: 'Countdown Target', type: 'datetime',
      description: timezoneGuidance,
      validation: (rule) => rule.custom((value, context) => {
        if (value === undefined && context.document?.countdownEnabled !== true) return true
        return validDatetime(value) || 'Enter a valid target with a timezone (required when enabled).'
      }),
    }),
    defineField({
      name: 'countdownExpiredMessage', title: 'Countdown Expired Message', type: 'string',
      validation: (rule) => rule.custom((value, context) => context.document?.countdownEnabled !== true
        || Boolean(value?.trim()) || 'Enter an expired message when the countdown is enabled.'),
    }),
  ],
})
