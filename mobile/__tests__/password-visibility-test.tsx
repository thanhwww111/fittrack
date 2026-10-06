import { render, screen, fireEvent } from '@testing-library/react-native';
import { TextField } from '@/components/ui/TextField';
it('toggles each password independently without changing its value', async () => {
 await render(<><TextField label="Password" secureTextEntry value="secret" /><TextField label="Confirm" secureTextEntry value="secret" /></>);
 expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(true);
 await fireEvent.press(screen.getAllByLabelText('Hiện mật khẩu')[0]);
 expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(false);
 expect(screen.getByLabelText('Password').props.value).toBe('secret');
 expect(screen.getByLabelText('Confirm').props.secureTextEntry).toBe(true);
 await fireEvent.press(screen.getByLabelText('Ẩn mật khẩu'));
 expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(true);
});
it('does not add a visibility button to ordinary fields', async () => {
 await render(<TextField label="Email" />);
 expect(screen.queryByLabelText('Hiện mật khẩu')).toBeNull();
});
