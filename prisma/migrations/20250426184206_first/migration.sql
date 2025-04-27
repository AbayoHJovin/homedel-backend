-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('Male', 'Female', 'Unisex');

-- CreateTable
CREATE TABLE "Users" (
    "userId" TEXT NOT NULL,
    "username" VARCHAR(255) NOT NULL,
    "email" TEXT NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "otp" VARCHAR(10),
    "resetToken" TEXT,
    "resetTokenExpiry" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "profilePicture" TEXT,

    CONSTRAINT "Users_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Cart" (
    "cartId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("cartId")
);

-- CreateTable
CREATE TABLE "CartProducts" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "CartProducts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Products" (
    "prodId" TEXT NOT NULL,
    "prodName" VARCHAR(255) NOT NULL,
    "prodDescription" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "gender" "Gender" NOT NULL,
    "category" VARCHAR(255) NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "popular" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Products_pkey" PRIMARY KEY ("prodId")
);

-- CreateTable
CREATE TABLE "ProductImages" (
    "imageId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductImages_pkey" PRIMARY KEY ("imageId")
);

-- CreateTable
CREATE TABLE "Orders" (
    "orderId" TEXT NOT NULL,
    "ordererId" TEXT NOT NULL,
    "address" VARCHAR(255) NOT NULL,
    "phoneNo" VARCHAR(15) NOT NULL,
    "paymentMethod" VARCHAR(255) NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "orderDate" TEXT,
    "transactionUrl" TEXT,

    CONSTRAINT "Orders_pkey" PRIMARY KEY ("orderId")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorites" (
    "favId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Favorites_pkey" PRIMARY KEY ("favId")
);

-- CreateTable
CREATE TABLE "FavProducts" (
    "id" TEXT NOT NULL,
    "favId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "FavProducts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "subscriptionId" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("subscriptionId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Users_email_key" ON "Users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Cart_ownerId_key" ON "Cart"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "CartProducts_cartId_productId_key" ON "CartProducts"("cartId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderItem_orderId_productId_key" ON "OrderItem"("orderId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "Favorites_userId_key" ON "Favorites"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FavProducts_favId_productId_key" ON "FavProducts"("favId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_email_key" ON "Subscription"("email");

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartProducts" ADD CONSTRAINT "CartProducts_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("cartId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartProducts" ADD CONSTRAINT "CartProducts_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Products"("prodId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImages" ADD CONSTRAINT "ProductImages_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Products"("prodId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orders" ADD CONSTRAINT "Orders_ordererId_fkey" FOREIGN KEY ("ordererId") REFERENCES "Users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Orders"("orderId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Products"("prodId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorites" ADD CONSTRAINT "Favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavProducts" ADD CONSTRAINT "FavProducts_favId_fkey" FOREIGN KEY ("favId") REFERENCES "Favorites"("favId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavProducts" ADD CONSTRAINT "FavProducts_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Products"("prodId") ON DELETE RESTRICT ON UPDATE CASCADE;
