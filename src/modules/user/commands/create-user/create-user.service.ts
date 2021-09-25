import { ID } from '@libs/ddd/domain/value-objects/id.value-object';
import { UserRepositoryPort } from '@modules/user/database/user.repository.port';
import { Address } from '@modules/user/domain/value-objects/address.value-object';
import { Email } from '@modules/user/domain/value-objects/email.value-object';
import { UnitOfWork } from '@src/infrastructure/database/unit-of-work/unit-of-work';
import { Result } from '@libs/ddd/domain/utils/result.util';
import { CreateUserCommand } from './create-user.command';
import { UserEntity } from '../../domain/entities/user.entity';
import { UserAlreadyExistsError } from '../../errors/user.errors';

export class CreateUserService {
  constructor(protected readonly unitOfWork: UnitOfWork) {}

  async execute(
    command: CreateUserCommand,
  ): Promise<Result<ID, UserAlreadyExistsError>> {
    /* Use a repository provided by UnitOfWork to include everything 
       (including changes caused by Domain Events) into one 
       atomic database transaction */
    return this.unitOfWork.execute(command.correlationId, async () => {
      const userRepo: UserRepositoryPort = this.unitOfWork.getUserRepository(
        command.correlationId,
      );
      // user uniqueness guard
      if (await userRepo.exists(command.email)) {
        return Result.err(new UserAlreadyExistsError());
      }

      const user = UserEntity.create({
        email: new Email(command.email),
        address: new Address({
          country: command.country,
          postalCode: command.postalCode,
          street: command.street,
        }),
      });

      user.someBusinessLogic();

      const created = await userRepo.save(user);
      return Result.ok(created.id);
    });
  }
}
