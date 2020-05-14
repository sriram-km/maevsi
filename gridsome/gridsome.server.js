// https://gridsome.org/docs/server-api/
// Changes here require a server restart.
const express = require('express')
const { iCal, tusd } = require('./src/server/middleware')

module.exports = function (api) {
  const paths = {
    account: '/accounts/:username([A-Za-z0-9-_]+)',
    accountSetting: '/accounts/:username([A-Za-z0-9-_]+)/settings',
    event: '/events/:username([A-Za-z0-9-_]+)/:event_name([-A-Za-z0-9_]+)',
    eventGroup: '/event-groups/:username([A-Za-z0-9-_]+)/:event_group_name([-A-Za-z0-9_]+)',
    eventIcs: '/ical',
    tusd: '/tusd'
  }

  api.configureServer(app => {
    app.use(express.json())
    app.post(paths.eventIcs, iCal)
    app.post(paths.tusd, tusd)
  })

  api.createPages(({ createPage }) => {
    // Use the Pages API here: https://gridsome.org/docs/pages-api/
    createPage({
      path: paths.account,
      component: './src/templates/Account.vue'
    })
    createPage({
      path: paths.accountSetting,
      component: './src/templates/AccountSettings.vue'
    })
    createPage({
      path: paths.event,
      component: './src/templates/Event.vue'
    })
    createPage({
      path: paths.eventGroup,
      component: './src/templates/EventGroup.vue'
    })
  })
}
