import { User, Phone } from "../models/user.models.js";
import { BadRequestError } from "../config/classErrors.config.js";
import bcrypt from "bcrypt";
import { sendEmailCode } from "./authCode.services.js";
import jwt from "jsonwebtoken";

// -- CADASTRO DE USUARIO NO BANCO DE DADOS --
async function registerUser(name, lastName, email, password) {
  // VERIFICA CONTA EXISTENTE
  const user = await User.findOne({ where: { email } });
  if (user) throw new BadRequestError("Usuário já cadastrado no nosso sistema");

  const hashPassword = await bcrypt.hash(
    password,
    Number(process.env.SALT_ROUNDS)
  ); // HASH DA SENHA

  // REGISTRA USUARIO NO BANCO
  const newUser = await User.create({
    name,
    lastName,
    nameUser: `${name} ${lastName}`,
    email,
    password: hashPassword,
    emailActive: false,
  });

  // ✅ CRIA DOIS TELEFONES VAZIOS
  await Phone.create({ phoneNumber: null, userId: newUser.id });
  await Phone.create({ phoneNumber: null, userId: newUser.id });

  await sendEmailCode(email);

  return newUser;
}

async function loginUser(email, password) {
  const user = await User.findOne({ where: { email } });
  if (!user)
    throw new BadRequestError("usuário não encontrado em nosso sistema");

  const passwordVerified = await bcrypt.compare(password, user.password);
  if (!passwordVerified) throw new BadRequestError("senha incorreta");

  return user;
}

// -- ASSINATURA DE TOKENS --
async function signTokenJwt(email) {
  const secretAccess = process.env.JWT_SECRET_ACCESS;
  const secretRefresh = process.env.JWT_SECRET_REFRESH;

  if (!secretAccess | !secretRefresh)
    throw new BadRequestError("As chaves token não foram definidas");

  const accessToken = jwt.sign({ email }, secretAccess, { expiresIn: "15m" });
  const refreshToken = jwt.sign({ email }, secretRefresh, { expiresIn: "3d" });

  return { accessToken, refreshToken };
}

export { registerUser, loginUser, signTokenJwt };
