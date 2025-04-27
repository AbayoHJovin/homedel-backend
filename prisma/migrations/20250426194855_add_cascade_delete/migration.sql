-- DropForeignKey
ALTER TABLE "CartProducts" DROP CONSTRAINT "CartProducts_productId_fkey";

-- DropForeignKey
ALTER TABLE "FavProducts" DROP CONSTRAINT "FavProducts_productId_fkey";

-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_productId_fkey";

-- DropForeignKey
ALTER TABLE "ProductImages" DROP CONSTRAINT "ProductImages_productId_fkey";

-- AddForeignKey
ALTER TABLE "CartProducts" ADD CONSTRAINT "CartProducts_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Products"("prodId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImages" ADD CONSTRAINT "ProductImages_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Products"("prodId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Products"("prodId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavProducts" ADD CONSTRAINT "FavProducts_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Products"("prodId") ON DELETE CASCADE ON UPDATE CASCADE;
