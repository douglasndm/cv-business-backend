import Product from '@models/Product';
import { getRepository } from 'typeorm';

async function getAllProductsFromTeam(team_id: string): Promise<Product[]> {
    const repository = getRepository(Product);

    const products = await repository
        .createQueryBuilder('product')
        .leftJoinAndSelect('product.batches', 'batch')
        .leftJoinAndSelect('product.team', 'prodTeam')
        .leftJoinAndSelect('prodTeam.team', 'team')
        .where('team.id = :team_id', { team_id })
        .getMany();

    return products;
}

export { getAllProductsFromTeam };
