/** Validações de dados portugueses (NIF, código postal, contactos, email). */

export function validarNif(valor: string): boolean {
  const nif = valor.replace(/\s/g, "");
  if (!/^\d{9}$/.test(nif)) return false;
  if (!"125689".includes(nif[0] as string)) return false;
  let soma = 0;
  for (let i = 0; i < 8; i += 1) soma += Number(nif[i]) * (9 - i);
  const resto = soma % 11;
  const controlo = resto < 2 ? 0 : 11 - resto;
  return controlo === Number(nif[8]);
}

export function validarCp(valor: string): boolean {
  return /^\d{4}-\d{3}$/.test(valor.trim());
}

export function formatarCp(valor: string): string {
  const d = valor.replace(/\D/g, "").slice(0, 7);
  return d.length > 4 ? `${d.slice(0, 4)}-${d.slice(4)}` : d;
}

export function validarTelefone(valor: string): boolean {
  return /^(\+351)?\s?\d{9}$/.test(valor.replace(/[\s.-]/g, "").replace(/^00351/, "+351"));
}

export function validarEmail(valor: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(valor.trim());
}

/** Devolve mensagem de erro ou null. Campos vazios são sempre aceites (opcionais). */
export function validarCampo(campo: string, valor: string): string | null {
  const v = (valor ?? "").trim();
  if (!v) return campo === "nome" ? "O nome é obrigatório" : null;
  switch (campo) {
    case "nif":
    case "nipc":
      return validarNif(v) ? null : "NIF/NIPC inválido (9 dígitos com dígito de controlo)";
    case "cp":
    case "localCp":
    case "decCp":
      return validarCp(v) ? null : "Código postal inválido (formato 1234-567)";
    case "email":
    case "decEmail":
      return validarEmail(v) ? null : "Email inválido";
    case "tlm":
    case "tel":
    case "contacto":
    case "decTlf":
    case "decTlm":
      return validarTelefone(v) ? null : "Contacto inválido (9 dígitos)";
    default:
      return null;
  }
}

/** Valida um formulário inteiro; devolve mapa campo → erro. */
export function validarForm(form: Record<string, string>, obrigatorios: string[] = []) {
  const erros: Record<string, string> = {};
  obrigatorios.forEach((c) => {
    if (!(form[c] ?? "").trim()) erros[c] = "Campo obrigatório";
  });
  Object.entries(form).forEach(([campo, valor]) => {
    if (erros[campo]) return;
    const erro = validarCampo(campo, valor ?? "");
    if (erro) erros[campo] = erro;
  });
  return erros;
}
