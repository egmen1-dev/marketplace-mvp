import { ProfileExperience } from "../../src/features/profile/ProfileExperience";
import { useProfileData } from "../../src/features/profile/useProfileData";

export default function ProfileScreen() {
  const state = useProfileData();
  return <ProfileExperience state={state} />;
}
