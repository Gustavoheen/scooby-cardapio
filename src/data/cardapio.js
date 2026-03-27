// ================================================================
//  Cardápio — Thalia Moreira Doces Artesanais
// ================================================================

export const ADICIONAIS = []

export const categorias = [

  // ── CASCÕES & CASQUINHAS ─────────────────────────────────────
  {
    id: 'cascoes',
    nome: '🍫 Cascões & Casquinhas',
    emoji: '🍫',
    itens: [
      {
        id: 1,
        nome: 'Cascão Kinder',
        descricao: 'Casquinha de chocolate recheada com creme de ninho, kinder bueno e ganache',
        imagem: '/fotos/cascao-kinder.jpg',
        preco: 16.00,
      },
      {
        id: 14,
        nome: 'Cascão de Ferrero',
        descricao: 'Casquinha de chocolate recheada com creme de ferrero rocher',
        imagem: '/fotos/cascao-ferrero.jpg',
        preco: 16.00,
      },
    ]
  },

  // ── BOLOS & PAVÊS ────────────────────────────────────────────
  {
    id: 'bolos',
    nome: '🎂 Bolos & Pavês',
    emoji: '🎂',
    itens: [
      {
        id: 2,
        nome: 'Mini Bolo Vulcão Ninho Com Nutella',
        descricao: 'Casquinha de chocolate recheada com creme de ninho e nutella',
        imagem: '/fotos/casquinha.jpg',
        preco: 10.00,
      },
      {
        id: 3,
        nome: 'Bolo Dois Amores',
        descricao: 'Bolo de chocolate com cobertura de chocolate ao leite e chocolate branco',
        imagem: '/fotos/bolo-dois-amores.jpg',
        preco: 45.00,
      },
      {
        id: 4,
        nome: 'Bolo de Pote Ninho com Brigadeiro',
        descricao: 'Bolo em camadas com creme de ninho e brigadeiro no pote',
        imagem: '/fotos/bolo-de-pote.jpg',
        preco: 13.00,
      },
      {
        id: 5,
        nome: 'Sandubrownie',
        descricao: 'Mini bolo recheado com creme de ninho e nutella derretendo por dentro',
        imagem: '/fotos/sandubrownie.jpg',
        preco: 15.00,
      },
      {
        id: 6,
        nome: 'Pavê Ninho com Brigadeiro',
        descricao: 'Pavê cremoso com camadas de biscoito, creme de ninho e brigadeiro',
        imagem: '/fotos/pave-ninho.jpg',
        preco: 14.00,
      },
      {
        id: 21,
        nome: 'Fatia Bombom de Oreo',
        descricao: 'Fatia de bolo de Oreo com creme de ninho, recheio de biscoito e cobertura de ganache',
        imagem: '/fotos/fatia-oreo.jpg',
        preco: 16.00,
      },
      {
        id: 15,
        nome: 'Fatia de Bolo Dois Amores',
        descricao: 'Fatia do bolo de chocolate com cobertura de chocolate ao leite e chocolate branco',
        imagem: '/fotos/fatia-bolo-dois-amores.jpg',
        preco: 16.00,
      },
      {
        id: 16,
        nome: 'Mini Bolo Vulcão Dois Amores com Morango',
        descricao: 'Mini bolo vulcão de chocolate com dois amores e morango derretendo por dentro',
        imagem: '/fotos/mini-bolo-vulcao-dois-amores.jpg',
        preco: 15.00,
      },
    ]
  },

  // ── TRUFAS & BOMBONS ─────────────────────────────────────────
  {
    id: 'trufas',
    nome: '🍬 Trufas & Bombons',
    emoji: '🍬',
    itens: [
      {
        id: 7,
        nome: 'Trufa Artesanal',
        descricao: 'Trufa artesanal feita com chocolate — escolha o sabor',
        imagem: '/fotos/trufas.jpg',
        proteinas: [
          { label: 'Oreo',              preco: 4.00 },
          { label: 'Ninho com Nutella', preco: 4.00 },
          { label: 'Maracujá',          preco: 4.00 },
          { label: 'Amendoim',          preco: 4.00 },
          { label: 'Coco',              preco: 4.00 },
        ]
      },
      {
        id: 8,
        nome: 'Caixinha com Trufas',
        descricao: 'Caixinha com 4 trufas artesanais de chocolate',
        imagem: '/fotos/caixinha-trufas.jpg',
        preco: 12.00,
      },
      {
        id: 9,
        nome: 'Bombom de Morango',
        descricao: 'Bombom de chocolate recheado com creme de morango',
        imagem: '/fotos/bombom-morango.jpg',
        preco: 12.00,
      },
    ]
  },

  // ── ESPECIAIS ────────────────────────────────────────────────
  {
    id: 'especiais',
    nome: '⭐ Especiais',
    emoji: '⭐',
    itens: [
      {
        id: 10,
        nome: 'Casquinha Recheada',
        descricao: 'Coxinha de chocolate com granulado de avelã e recheio de nutella',
        imagem: '/fotos/coxinha-ferrero.jpg',
        preco: 12.00,
      },
      {
        id: 11,
        nome: 'Sandubrownie',
        descricao: 'Brownie recheado com creme de ninho e nutella — irresistível!',
        imagem: '/fotos/sandubrownie.jpg',
        preco: 12.00,
      },
      {
        id: 23,
        nome: 'Brownie Supremo Kinder',
        descricao: 'Brownie artesanal com creme de ninho, kinder bueno e calda de chocolate',
        imagem: '/fotos/brownie-supremo-kinder.jpg',
        preco: 16.00,
      },
      {
        id: 17,
        nome: 'Brownie Supremo',
        descricao: 'Brownie artesanal com cobertura especial de chocolate',
        imagem: '/fotos/brownie-supremo.jpg',
        preco: 15.00,
      },
      {
        id: 18,
        nome: 'Brownie Supremo Ninho com Nutella',
        descricao: 'Brownie artesanal coberto com creme de ninho e nutella',
        imagem: '/fotos/brownie-supremo-ninho.jpg',
        preco: 15.00,
      },
      {
        id: 19,
        nome: 'Kit Degustação Mini Ovos',
        descricao: 'Kit com mini ovos de chocolate artesanais para degustação',
        imagem: '/fotos/kit-mini-ovos.jpg',
        preco: 25.00,
      },
      {
        id: 20,
        nome: 'Trio Coxinhas de Morango',
        descricao: 'Trio de coxinhas de chocolate recheadas com creme de morango',
        imagem: '/fotos/trio-coxinhas-morango.jpg',
        preco: 30.00,
      },
    ]
  },

  // ── COPOS ────────────────────────────────────────────────────
  {
    id: 'copos',
    nome: '🥤 Copos',
    emoji: '🥤',
    itens: [
      {
        id: 12,
        nome: 'Bombom Aberto De Morango',
        descricao: 'Copo com camadas de morango, creme de ninho, brigadeiro e decoração especial',
        imagem: '/fotos/bombom-aberto-morango.jpg',
        preco: 17.00,
      },
      {
        id: 22,
        nome: 'Copo da Felicidade Morango',
        descricao: 'Copo com camadas de creme de ninho, brownie, morangos frescos, ganache e Kinder Bueno',
        imagem: '/fotos/copo-felicidade-morango.jpg',
        preco: 17.00,
      },
      {
        id: 13,
        nome: 'Copo Supremo Maracujá',
        descricao: 'Copo com mousse de maracujá, brownie, creme de ninho e brigadeiro',
        imagem: '/fotos/copo-maracuja.jpg',
        preco: 17.00,
      },
    ]
  },

  // ── BEBIDAS ──────────────────────────────────────────────────
  {
    id: 'bebidas',
    nome: '🥤 Bebidas',
    emoji: '🥤',
    itens: [
      {
        id: 24,
        nome: 'Coca-Cola Mini',
        descricao: 'Lata 220ml gelada',
        imagem: '',
        preco: 3.00,
      },
      {
        id: 25,
        nome: 'Coca-Cola Mini Zero',
        descricao: 'Lata 220ml gelada zero açúcar',
        imagem: '',
        preco: 3.00,
      },
    ]
  },
]
