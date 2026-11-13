// Controls that the ParityGallery does not show, plus stress cases: long text, empty states.
import { useState } from "react";
import { View } from "react-native";
import { IconBell, IconSettings } from "@tabler/icons-react-native";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Card,
  CardContent,
  CardSkeleton,
  Chip,
  DividedList,
  EmptyState,
  HeaderIconButton,
  ListRow,
  PasswordInput,
  PillTabs,
  SearchInput,
} from "@vvedantb/native-ui";
import { Block, GText, LONG_TEXT } from "../ui";

type Range = "day" | "week" | "month";

export function FormsSection() {
  const [password, setPassword] = useState("");
  const [chips, setChips] = useState<string[]>(["Pink"]);
  const [range, setRange] = useState<Range>("week");
  const [search, setSearch] = useState("");
  return (
    <>
      <Block title="PasswordInput">
        <PasswordInput testID="pw" value={password} onChangeText={setPassword} placeholder="Password" />
        <GText testID="pw-length">{`Length: ${password.length}`}</GText>
      </Block>
      <Block title="Chip">
        <View className="flex-row flex-wrap gap-2">
          {["Pink", "Blue", "Green", LONG_TEXT].map((label) => (
            <Chip
              key={label}
              label={label}
              selected={chips.includes(label)}
              onPress={() => setChips((c) => (c.includes(label) ? c.filter((x) => x !== label) : [...c, label]))}
            />
          ))}
        </View>
      </Block>
      <Block title="PillTabs">
        <PillTabs<Range>
          options={[
            { id: "day", label: "Day" },
            { id: "week", label: "Week" },
            { id: "month", label: "Month" },
          ]}
          value={range}
          onChange={setRange}
        />
        <GText testID="pill-value">{`Range: ${range}`}</GText>
      </Block>
      <Block title="HeaderIconButton">
        <View className="flex-row gap-2">
          <HeaderIconButton label="Notifications" onPress={() => undefined}>
            <IconBell size={22} />
          </HeaderIconButton>
          <HeaderIconButton label="Settings" onPress={() => undefined}>
            <IconSettings size={22} />
          </HeaderIconButton>
        </View>
      </Block>
      <Block title="Avatar, AvatarImage, AvatarFallback">
        <View className="flex-row gap-3">
          <Avatar>
            <AvatarImage source={{ uri: "https://invalid.example/none.png" }} accessibilityLabel="Broken image" />
            <AvatarFallback>AB</AvatarFallback>
          </Avatar>
          <Avatar size={56}>
            <AvatarFallback>{LONG_TEXT.slice(0, 2)}</AvatarFallback>
          </Avatar>
        </View>
      </Block>
      <Block title="DividedList">
        <Card>
          <CardContent>
            <DividedList>
              <ListRow title="First row" />
              <ListRow title={LONG_TEXT} meta={LONG_TEXT} />
              <ListRow title="Third row" />
            </DividedList>
          </CardContent>
        </Card>
      </Block>
      <Block title="Empty states">
        <SearchInput testID="empty-search" value={search} onChange={setSearch} label="Search nothing" />
        <EmptyState title="Nothing here" description="No items match the search." />
      </Block>
      <Block title="CardSkeleton">
        <CardSkeleton />
      </Block>
    </>
  );
}
