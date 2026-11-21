import { CheckoutService } from '../src/services/CheckoutService.js';
import { Item } from '../src/domain/Item.js';
import { UserMother } from './builders/UserMother.js';
import { CarrinhoBuilder } from './builders/CarrinhoBuilder.js';

const CARTAO = '4111-1111-1111-1111';

describe('CheckoutService', () => {
    describe('quando o pagamento falha', () => {
        it('deve retornar null (verificação de estado com Stub)', async () => {
            // Arrange
            const carrinho = new CarrinhoBuilder().build();
            // stub: só devolve a resposta de pagamento recusado
            const gatewayStub = { cobrar: jest.fn().mockResolvedValue({ success: false }) };
            // dummies: só pra passar no construtor, não devem ser usados aqui
            const repositoryDummy = {};
            const emailDummy = {};
            const checkoutService = new CheckoutService(gatewayStub, repositoryDummy, emailDummy);

            // Act
            const pedido = await checkoutService.processarPedido(carrinho, CARTAO);

            // Assert (estado)
            expect(pedido).toBeNull();
        });

        it('não deve salvar o pedido nem enviar e-mail (verificação de comportamento)', async () => {
            // Arrange
            const carrinho = new CarrinhoBuilder().build();
            const gatewayStub = { cobrar: jest.fn().mockResolvedValue({ success: false }) };
            const repositoryMock = { salvar: jest.fn() };
            const emailMock = { enviarEmail: jest.fn() };
            const checkoutService = new CheckoutService(gatewayStub, repositoryMock, emailMock);

            // Act
            await checkoutService.processarPedido(carrinho, CARTAO);

            // Assert (comportamento)
            expect(repositoryMock.salvar).not.toHaveBeenCalled();
            expect(emailMock.enviarEmail).not.toHaveBeenCalled();
        });
    });

    describe('quando um cliente Padrão finaliza a compra', () => {
        it('deve retornar o pedido salvo com o totalFinal sem desconto (verificação de estado)', async () => {
            // Arrange
            const carrinho = new CarrinhoBuilder()
                .comUser(UserMother.umUsuarioPadrao())
                .comItens([new Item('Teclado', 150), new Item('Mouse', 50)])
                .build();
            const gatewayStub = { cobrar: jest.fn().mockResolvedValue({ success: true }) };
            const repositoryStub = {
                salvar: jest.fn().mockImplementation(async (pedido) => ({ ...pedido, id: 42 })),
            };
            const emailDummy = { enviarEmail: jest.fn() };
            const checkoutService = new CheckoutService(gatewayStub, repositoryStub, emailDummy);

            // Act
            const pedido = await checkoutService.processarPedido(carrinho, CARTAO);

            // Assert (estado)
            expect(pedido.id).toBe(42);
            expect(pedido.totalFinal).toBe(200);
            expect(pedido.status).toBe('PROCESSADO');
        });
    });

    describe('quando um cliente Premium finaliza a compra', () => {
        let usuarioPremium;
        let gatewayStub;
        let repositoryStub;
        let emailMock;
        let checkoutService;
        let pedidoSalvo;

        beforeEach(async () => {
            // Arrange
            usuarioPremium = UserMother.umUsuarioPremium();
            const carrinho = new CarrinhoBuilder()
                .comUser(usuarioPremium)
                .comValorTotal(200)
                .build();
            gatewayStub = { cobrar: jest.fn().mockResolvedValue({ success: true }) };
            repositoryStub = {
                salvar: jest.fn().mockImplementation(async (pedido) => ({ ...pedido, id: 123 })),
            };
            emailMock = { enviarEmail: jest.fn().mockResolvedValue(undefined) };
            checkoutService = new CheckoutService(gatewayStub, repositoryStub, emailMock);

            // Act
            pedidoSalvo = await checkoutService.processarPedido(carrinho, CARTAO);
        });

        it('deve cobrar o valor com 10% de desconto (R$ 180,00)', () => {
            // Assert (comportamento)
            expect(gatewayStub.cobrar).toHaveBeenCalledTimes(1);
            expect(gatewayStub.cobrar).toHaveBeenCalledWith(180, CARTAO);
        });

        it('deve enviar exatamente um e-mail de confirmação ao cliente', () => {
            // Assert (comportamento)
            expect(emailMock.enviarEmail).toHaveBeenCalledTimes(1);
            expect(emailMock.enviarEmail).toHaveBeenCalledWith(
                'premium@email.com',
                'Seu Pedido foi Aprovado!',
                'Pedido 123 no valor de R$180'
            );
        });

        it('deve retornar o pedido salvo com o total com desconto', () => {
            // Assert (estado)
            expect(pedidoSalvo.id).toBe(123);
            expect(pedidoSalvo.totalFinal).toBe(180);
            expect(pedidoSalvo.carrinho.user).toBe(usuarioPremium);
        });
    });

    describe('quando o envio de e-mail falha', () => {
        it('não deve falhar o checkout e ainda retornar o pedido salvo', async () => {
            // Arrange
            const carrinho = new CarrinhoBuilder().build();
            const gatewayStub = { cobrar: jest.fn().mockResolvedValue({ success: true }) };
            const repositoryStub = {
                salvar: jest.fn().mockImplementation(async (pedido) => ({ ...pedido, id: 7 })),
            };
            const emailStub = {
                enviarEmail: jest.fn().mockRejectedValue(new Error('SMTP indisponível')),
            };
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            const checkoutService = new CheckoutService(gatewayStub, repositoryStub, emailStub);

            // Act
            const pedido = await checkoutService.processarPedido(carrinho, CARTAO);

            // Assert
            expect(pedido.id).toBe(7);
            expect(consoleSpy).toHaveBeenCalledWith('Falha ao enviar e-mail', 'SMTP indisponível');

            consoleSpy.mockRestore();
        });
    });
});

describe('CarrinhoBuilder', () => {
    it('cria por padrão um carrinho de usuário padrão com 1 item', () => {
        const carrinho = new CarrinhoBuilder().build();

        expect(carrinho.user.isPremium()).toBe(false);
        expect(carrinho.itens).toHaveLength(1);
    });

    it('permite criar um carrinho vazio de forma explícita', () => {
        const carrinho = new CarrinhoBuilder().vazio().build();

        expect(carrinho.itens).toHaveLength(0);
        expect(carrinho.calcularTotal()).toBe(0);
    });

    it('permite adicionar itens de forma fluente', () => {
        const carrinho = new CarrinhoBuilder()
            .vazio()
            .comItem('Livro', 30)
            .comItem('Caneta', 5)
            .build();

        expect(carrinho.itens).toHaveLength(2);
        expect(carrinho.calcularTotal()).toBe(35);
    });
});
