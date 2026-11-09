import * as React from "react";
import { Pressable, View } from "react-native";
import { IconEye, IconEyeOff } from "@tabler/icons-react-native";
import { Input } from "./Input";
import { touchSlop } from "./controlStyles";
import { tokens } from "./tokens";
import { useLargerText } from "./theme";
import { useScheme } from "./useScheme";

type PasswordInputProps = Omit<React.ComponentPropsWithoutRef<typeof Input>, "secureTextEntry"> & {
  /** Classes for the `View` around the field and the toggle. */
  wrapperClassName?: string;
};

/** Toggle metrics: painted 24 (32 with larger text), 44 with its hit slop. */
function passwordToggleSize(largerText: boolean) {
  return largerText
    ? ({ button: 32, icon: 20, right: 12, paddingRight: 56 } as const)
    : ({ button: 24, icon: 18, right: 8, paddingRight: 44 } as const);
}

/**
 * `Input` for a password, with a show/hide eye button at the end. The text is
 * hidden at first. The toggle flips `secureTextEntry` on the same mounted
 * field, so focus and the cursor stay where they were. The `secureTextEntry`
 * prop is not accepted: the toggle owns it. Every other `Input` prop, `ref`
 * and `testID` pass through. The toggle is labelled "Show password" while the
 * text is hidden and "Hide password" while it shows, has the test ID
 * `${testID}-toggle` (`password-input-toggle` without a `testID`), is painted
 * at 24 and reaches 44 with its hit slop (`touchSlop`). It is hidden when the
 * field is not editable. Inside a `ScrollView`, set
 * `keyboardShouldPersistTaps="handled"` so the first tap toggles while the
 * keyboard is up.
 */
const PasswordInput = React.forwardRef<
  React.ElementRef<typeof Input>,
  PasswordInputProps
>(({ wrapperClassName, style, testID, ...props }, ref) => {
  const largerText = useLargerText();
  const scheme = useScheme();
  const [visible, setVisible] = React.useState(false);
  const metrics = passwordToggleSize(largerText);
  const muted = tokens.color.muted[scheme];
  const Icon = visible ? IconEyeOff : IconEye;
  return (
    <View className={wrapperClassName}>
      <Input
        {...props}
        ref={ref}
        testID={testID}
        // After the spread, so a caller cannot fight the toggle.
        secureTextEntry={!visible}
        // Room for the toggle, so text does not run under it.
        style={[{ paddingRight: metrics.paddingRight }, style]}
      />
      {props.editable !== false ? (
        <View
          pointerEvents="box-none"
          className="absolute bottom-0 top-0 justify-center"
          style={{ right: metrics.right }}
        >
          <Pressable
            testID={testID ? `${testID}-toggle` : "password-input-toggle"}
            accessibilityRole="button"
            accessibilityLabel={visible ? "Hide password" : "Show password"}
            hitSlop={touchSlop(metrics.button)}
            onPress={() => setVisible((current) => !current)}
            className="items-center justify-center rounded-md active:opacity-70"
            style={{ width: metrics.button, height: metrics.button }}
          >
            {/* `strokeWidth`, not `stroke`: here `stroke` is the colour. */}
            <Icon size={metrics.icon} color={muted} strokeWidth={1.75} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
});

PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
export type { PasswordInputProps };
