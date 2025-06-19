# RetryService

O `RetryService` é uma classe utilitária para tentativas automáticas de execução de operações com controle de tentativas e atrasos progressivos (backoff) em caso de falha. É útil em cenários onde você precisa executar uma operação que pode falhar intermitentemente (como chamadas de API ou acesso a banco de dados).

## Instalação

Para instalar o `RetryService` no seu projeto NestJS, basta adicionar o arquivo da classe no seu diretório de serviços e injetá-la onde necessário.

Se você ainda não tem o NestJS instalado, siga as instruções na [documentação oficial](https://docs.nestjs.com/) para configurar um novo projeto.

## Como usar

### 1. Instalar Dependências

Certifique-se de que o `LoggerService` está instalado e configurado no seu projeto. Caso contrário, você pode usar o logger padrão do NestJS.

### 2. Importar e Injetar o `RetryService`

Para utilizar o `RetryService` em qualquer serviço do seu projeto NestJS, faça a injeção dele no construtor da sua classe.


### 3.  Configuração do RetryService

- O RetryService possui os seguintes parâmetros de configuração:

    * maxRetries (opcional): Número máximo de tentativas. O padrão é 3.
    * retryDelayMs (opcional): Atraso entre as tentativas em milissegundos. O padrão é 1000 ms (1 segundo).
    * jitterFactor (opcional): Fator que adiciona variação ao atraso. O padrão é 0.5, que significa uma variação entre 0 e 50% do valor de retryDelayMs.

- Esses parâmetros podem ser passados diretamente para o método retryOperation ou podem ser configurados ao criar a instância do RetryService.

### 4.  Exemplo de utilização

```typescript
import { Injectable, LoggerService } from '@nestjs/common';
import { RetryService } from './retry.service';

@Injectable()
export class MyService {
  constructor(
    private readonly retryService: RetryService,
    private readonly logger: LoggerService,
  ) {}

  async executeWithRetry() {
    try {
      const result = await this.retryService.retryOperation(
        async () => {
          // Simula uma operação que pode falhar
          throw new Error('Operação falhou');
        },
        5, // Tentar 5 vezes
        500, // Atraso de 500ms entre tentativas
        0.2  // Fator de jitter de 20%
      );
      this.logger.log('Operação bem-sucedida:', result);
    } catch (error) {
      this.logger.error('Falha após todas as tentativas:', error.message);
    }
  }
}
```

### 5.  Tratamento de erros
- Se todas as tentativas falharem, o RetryService lança um erro com a mensagem:

```bash
Failed after attempt #: <número de tentativas>
```
* Além disso, ele registra cada falha no logger configurado, facilitando a monitoração de falhas.

### 6. Métodos disponíveis

- retryOperation<T>(operation: () => Promise<T>, maxRetries?: number, retryDelayMs?: number, jitterFactor?: number): Promise<T>

- Parâmetros:

* operation: Função assíncrona que retorna uma Promise<T>.
* maxRetries: Número máximo de tentativas (opcional).
* retryDelayMs: Atraso entre tentativas (opcional).
* jitterFactor: Fator de jitter para variação do atraso (opcional).

- Retorna: O resultado da operação quando bem-sucedida.
- Lança: Um erro se todas as tentativas falharem.


### 7. Resumo

- O RetryService facilita a implementação de lógica de retry com backoff exponencial em NestJS, útil para situações em que operações assíncronas podem falhar temporariamente. Ele permite personalizar o comportamento de tentativas e atrasos e fornece uma maneira robusta de lidar com falhas intermitentes.