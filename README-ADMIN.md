# Avaliação Google por empresa

## Configuração obrigatória

O painel e os links exclusivos usam Supabase para salvar os dados e refletir as alterações para todos os visitantes.

1. Crie/abra um projeto Supabase.
2. No Supabase, abra **SQL Editor**, cole e execute o conteúdo de `supabase/schema.sql`.
3. Na hospedagem Vercel, adicione estas Environment Variables:
   - `SUPABASE_URL`: URL do projeto Supabase.
   - `SUPABASE_SERVICE_ROLE_KEY`: chave service_role do projeto (somente no servidor; nunca use no navegador).
   - `ADMIN_PASSWORD`: senha do painel. Para usar a senha solicitada, defina como `031`.
   - `ADMIN_SESSION_SECRET`: segredo longo e aleatório para assinar a sessão do painel.
4. Faça um novo deploy depois de configurar as variáveis.

Existe um modelo em `.env.example`. Não envie credenciais reais ao GitHub.

## Como usar

- Abra `/painel-secreto` no domínio publicado para entrar no painel administrativo oculto.
- Cadastre o nome de cada empresa e o link oficial de avaliação do Google.
- O painel gera um endereço exclusivo como `/empresa/restaurante-central-a1b2c`.
- Copie e envie esse endereço para a empresa/cliente. A página exclusiva usa o link de avaliação e o QR Code daquela empresa.
- Para trocar o destino de avaliação, edite o link no cartão da empresa e clique em **Salvar link de avaliação**. A página exclusiva passa a usar o link atualizado.

O painel fica fora da navegação pública e a sessão administrativa usa cookie HttpOnly assinado. A senha `031` é curta; se decidir trocar, altere apenas a variável `ADMIN_PASSWORD` na Vercel.
