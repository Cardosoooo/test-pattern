import { Carrinho } from '../../src/domain/Carrinho.js';
import { Item } from '../../src/domain/Item.js';
import { UserMother } from './UserMother.js';

// Data Builder para o Carrinho.
// O carrinho pode variar em várias coisas (usuário, itens, valores, vazio...),
// então em vez de um método para cada combinação o teste muda só o que precisa.
export class CarrinhoBuilder {
    constructor() {
        // padrão: usuário comum com 1 item de R$ 100
        this.user = UserMother.umUsuarioPadrao();
        this.itens = [new Item('Item Padrão', 100)];
    }

    comUser(user) {
        this.user = user;
        return this;
    }

    comItens(itens) {
        this.itens = [...itens];
        return this;
    }

    comItem(nome, preco) {
        this.itens.push(new Item(nome, preco));
        return this;
    }

    // troca os itens por um só item com o valor informado
    comValorTotal(valor) {
        this.itens = [new Item('Item', valor)];
        return this;
    }

    vazio() {
        this.itens = [];
        return this;
    }

    build() {
        return new Carrinho(this.user, [...this.itens]);
    }
}
