import { Request, Response } from 'express';
import { getRepository } from 'typeorm';
import { compareAsc, startOfDay } from 'date-fns';
import * as Yup from 'yup';

import AppError from '@errors/AppError';

import User from '@models/User';

import { createUser, deleteUser } from '@utils/Users';

class UserController {
    async index(req: Request, res: Response): Promise<Response> {
        const { id } = req.params;

        const repository = getRepository(User);

        const user = await repository
            .createQueryBuilder('user')
            .where('user.firebaseUid = :id', { id })
            .leftJoinAndSelect('user.roles', 'roles')
            .leftJoinAndSelect('roles.team', 'team')
            .leftJoinAndSelect('team.subscriptions', 'subscriptions')
            .getOne();

        if (!user) {
            throw new AppError('User not found', 401);
        }

        const organizedUser = {
            id: user.firebaseUid,
            email: user.email,

            roles: user.roles.map(r => {
                const subscriptions = r.team.subscriptions.filter(
                    sub =>
                        compareAsc(
                            startOfDay(new Date()),
                            startOfDay(sub.expireIn),
                        ) <= 0,
                );

                return {
                    role: r.role,
                    status: r.status,
                    team: {
                        id: r.team.id,
                        name: r.team.name,
                        isActive: subscriptions.length > 0,
                    },
                };
            }),
        };

        return res.status(200).json(organizedUser);
    }

    async store(req: Request, res: Response): Promise<Response> {
        const schema = Yup.object().shape({
            firebaseUid: Yup.string().required(),
            email: Yup.string().required().email(),
        });

        try {
            await schema.validate(req.body);
        } catch (err) {
            throw new AppError(err.message, 400);
        }

        const { firebaseUid, email } = req.body;

        let userId = firebaseUid;

        if (req.userId) {
            userId = req.userId;
        }
        if (!userId) {
            throw new AppError('Provider the user id', 401);
        }

        const repository = getRepository(User);
        const existsUser = await repository.findOne({ where: { email } });

        if (existsUser) {
            throw new AppError('User already exists', 400);
        }

        const savedUser = await createUser({ firebaseUid, email });

        return res.status(201).json(savedUser);
    }

    async delete(req: Request, res: Response): Promise<Response> {
        if (!req.userId) {
            throw new AppError('Provider the user id', 401);
        }

        await deleteUser({ user_id: req.userId });

        return res.status(204).send();
    }
}

export default new UserController();
