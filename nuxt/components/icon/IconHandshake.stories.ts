import { defineComponent } from '#app'
import IconHandshake from './IconHandshake.vue'

const argTypes = { click: { action: 'click' } }
type ArgTypesType = { argTypes: typeof argTypes }

export default {
  component: IconHandshake,
  title: 'icon/IconHandshake',
  argTypes,
}

const Template = (_: never, { argTypes }: ArgTypesType) =>
  defineComponent({
    components: { IconHandshake },
    props: Object.keys(argTypes),
    template:
      // eslint-disable-next-line @intlify/vue-i18n/no-raw-text
      '<IconHandshake v-bind="$props" @click="click">IconHandshake</IconHandshake>',
  })

export const Default = Template.bind({})
