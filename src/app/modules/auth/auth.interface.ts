export type TLoginUser = {
  email: string;
  password: string;
};

export type TRefreshTokenPayload = {
  refreshToken: string;
};

export type TChangePasswordPayload = {
  oldPassword: string;
  newPassword: string;
};

export type TResetPasswordPayload = {
  newPassword: string;
};
