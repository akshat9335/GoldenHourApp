import { Redirect } from 'expo-router';

// The uploaded project already has an `explore.tsx` route at the app root.
// In this design, "explore" maps to the Nearby Hospitals experience —
// update this redirect if you want `explore` to point somewhere else.
export default function Explore() {
  return <Redirect href="/nearby-hospitals" />;
}
