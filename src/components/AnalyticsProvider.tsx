'use client'
import GoogleAnalytics from './Analytics'
import PostHog from './PostHog'

export default function AnalyticsProvider() {
  return (
    <>
      <GoogleAnalytics />
      <PostHog />
    </>
  )
}
