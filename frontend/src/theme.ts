// theme.ts
import { createTheme, Button, TextInput, PasswordInput, Paper } from '@mantine/core';

export const theme = createTheme({
  primaryColor: 'indigo',

  /** 全局圆角、字体 */
  defaultRadius: 'md',
  // fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',

  /** 组件默认样式 */
  components: {
    Button: Button.extend({
      defaultProps: {
        size: 'md',
        radius: 'md',
      },
      styles: (theme) => ({
        root: {
          backgroundImage: `linear-gradient(135deg, ${theme.colors.indigo[5]}, ${theme.colors.blue[5]})`,
          fontWeight: 600,
          letterSpacing: 0.5,
          transition: 'transform 150ms ease, box-shadow 150ms ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: theme.shadows.md,
          },
        },
      }),
    }),

    TextInput: TextInput.extend({
      defaultProps: {
        size: 'md',
        radius: 'md',
        variant: 'filled',
      },
      styles: (theme) => ({
        input: {
          border: `1px solid ${theme.colors.gray[3]}`,
          backgroundColor: theme.colors.gray[0],
          '&:focus': {
            borderColor: theme.colors.indigo[5],
            boxShadow: `0 0 0 2px ${theme.colors.indigo[2]}`,
          },
        },
      }),
    }),

    PasswordInput: PasswordInput.extend({
      defaultProps: {
        size: 'md',
        radius: 'md',
        variant: 'filled',
      },
      styles: (theme) => ({
        input: {
          border: `1px solid ${theme.colors.gray[3]}`,
          backgroundColor: theme.colors.gray[0],
          '&:focus': {
            borderColor: theme.colors.indigo[5],
            boxShadow: `0 0 0 2px ${theme.colors.indigo[2]}`,
          },
        },
      }),
    }),

    Paper: Paper.extend({
      defaultProps: {
        radius: 'lg',
        shadow: 'xl',
        withBorder: false,
      },
      styles: (theme) => ({
        root: {
          backdropFilter: 'blur(12px)',
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          border: `1px solid ${theme.colors.gray[2]}`,
        },
      }),
    }),
  },
});
