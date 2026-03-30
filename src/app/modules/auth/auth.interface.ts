export type TLoginUser = {
  email: string;
  password: string;
  verificationToken?: string;
};

export type TSocialLoginPayload = {
  name: string;
  email: string;
  image?: string;
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

export type TBrand = 'bringByAir' | 'pandaBD';
