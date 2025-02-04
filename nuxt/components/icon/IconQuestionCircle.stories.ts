import { defineComponent } from '#app'
import IconQuestionCircle from './IconQuestionCircle.vue'

const argTypes = { click: { action: 'click' } }
type ArgTypesType = { argTypes: typeof argTypes }

export default {
  component: IconQuestionCircle,
  title: 'icon/IconQuestionCircle',
  argTypes,
}

const Template = (_: never, { argTypes }: ArgTypesType) =>
  defineComponent({
    components: { IconQuestionCircle },
    props: Object.keys(argTypes),
    template:
      // eslint-disable-next-line @intlify/vue-i18n/no-raw-text
      '<IconQuestionCircle v-bind="$props" @click="click">IconQuestionCircle</IconQuestionCircle>',
  })

export const Default = Template.bind({})
