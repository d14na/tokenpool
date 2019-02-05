/* Initialize VueJs. */
import Vue from 'vue'

import AccountDashboard from './account-dashboard'
import AccountRenderer from './account-renderer'
import AlertRenderer from './alert-renderer'
import HomeDashboard from './home-dashboard'
import HomeRenderer from './home-renderer'
import OverviewDashboard from './overview-dashboard'
import OverviewRenderer from './overview-renderer'
import ProfileRenderer from './profile-renderer'

import logo from '../images/0xbitcoin.png'
import githubLogo from '../images/GitHub-Mark-64px.png'

/* Initialize JQuery. */
const $ = require('jquery')

const account = new AccountDashboard()
const accountRenderer = new AccountRenderer()
const alertRenderer = new AlertRenderer()
const overview = new OverviewDashboard()
const overviewRenderer = new OverviewRenderer()
const profileRenderer = new ProfileRenderer()
const home = new HomeDashboard()
const homeRenderer = new HomeRenderer()

const navbar = new Vue({
    el: '#navbar',
    data: {
        brandImageUrl: logo,
        githubLogo: githubLogo
    }
})

$(document).ready(function () {
    if ($("#home").length > 0) {
        home.init(homeRenderer)
    }

    if ($("#profile").length > 0) {
        profileRenderer.init()
    }

    if ($("#account").length > 0) {
        account.init(accountRenderer)
    }

    if ($("#overview").length > 0) {
        overview.init(overviewRenderer)
    }
})
