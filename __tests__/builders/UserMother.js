import { User } from '../../src/domain/User.js';

// Object Mother para usuários.
// O User é simples e só tem dois tipos que importam pros testes (PADRAO e PREMIUM),
// então dois métodos fixos já resolvem.
export class UserMother {
    static umUsuarioPadrao() {
        return new User(1, 'Usuário Padrão', 'padrao@email.com', 'PADRAO');
    }

    static umUsuarioPremium() {
        return new User(2, 'Usuário Premium', 'premium@email.com', 'PREMIUM');
    }
}
