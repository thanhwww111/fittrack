import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { NumberStepper } from "@/components/ui/NumberStepper";

function Quantity({ initial = "1,5" }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return <NumberStepper label="Quantity" value={value} onChangeText={setValue}
    min={0} max={10000} decimal positive />;
}

it("preserves fractional quantities and never decrements to zero", async () => {
  await render(<Quantity />);
  await fireEvent.press(screen.getByLabelText("Tăng Quantity"));
  expect(screen.getByLabelText("Quantity").props.value).toBe("2.5");
  await fireEvent.press(screen.getByLabelText("Giảm Quantity"));
  await fireEvent.press(screen.getByLabelText("Giảm Quantity"));
  expect(screen.getByLabelText("Quantity").props.value).toBe("0.5");
  expect(screen.getByLabelText("Giảm Quantity")).toBeDisabled();
  await fireEvent.changeText(screen.getByLabelText("Quantity"), "9999.5");
  await fireEvent.press(screen.getByLabelText("Tăng Quantity"));
  expect(screen.getByLabelText("Quantity").props.value).toBe("10000");
  expect(screen.getByLabelText("Tăng Quantity")).toBeDisabled();
});

it("starts an empty quantity at one and recovers from invalid text", async () => {
  await render(<Quantity initial="" />);
  await fireEvent.press(screen.getByLabelText("Tăng Quantity"));
  expect(screen.getByLabelText("Quantity").props.value).toBe("1");
  await fireEvent.changeText(screen.getByLabelText("Quantity"), "abc");
  await fireEvent.press(screen.getByLabelText("Tăng Quantity"));
  expect(screen.getByLabelText("Quantity").props.value).toBe("1");
});
