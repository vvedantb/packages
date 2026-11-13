import { View } from "react-native";
import {
  APP_ICONS,
  AppMark,
  AppWordmark,
  GoogleMark,
  IconBee,
  IconEva,
  IconProjectV,
  IconVelth,
  IconVerve,
  IconVhub,
  IconVibot,
  IconVmem,
} from "@vvedantb/native-ui/brand";
import { Block, GText } from "../ui";

const ICONS = [IconBee, IconEva, IconProjectV, IconVelth, IconVerve, IconVhub, IconVibot, IconVmem];

export function BrandSection() {
  return (
    <>
      <Block title="Icon marks">
        <View className="flex-row flex-wrap gap-4">
          {ICONS.map((Icon, index) => (
            <Icon key={index} size={48} />
          ))}
        </View>
        <GText>{`APP_ICONS entries: ${Object.keys(APP_ICONS).length}`}</GText>
      </Block>
      <Block title="AppMark, AppWordmark, GoogleMark">
        <View className="flex-row flex-wrap items-center gap-4">
          <AppMark app="vibot" size={48} />
          <AppWordmark app="vibot" />
          <GoogleMark size={32} />
        </View>
      </Block>
    </>
  );
}
