import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { GET as listProducts, POST as createProduct } from "@/app/api/v1/products/route";
import {
  GET as getProductById,
  PATCH as updateProductById,
  DELETE as deleteProductById,
} from "@/app/api/v1/products/[id]/route";
import { UserRepository, BprRepository, ProductRepository } from "@/lib/repositories";
import { db } from "@/lib/db";
import { SESSION_COOKIE_NAME, signSessionToken } from "@/lib/auth";

describe("TASK-021: Product Management API & Financial Hierarchy Validation", () => {
  let superAdminId: string;
  let adminMadiunId: string;
  let marketingId: string;

  let superAdminToken: string;
  let adminMadiunToken: string;
  let marketingToken: string;

  let seededBprId: string;
  let seededProductId: string;

  let otherBprId: string;
  let otherProductId: string;

  const testUserIds: string[] = [];
  const testBprIds: string[] = [];
  const testProductIds: string[] = [];

  beforeAll(async () => {
    // 1. Fetch Roles, Seeded BPR, and Seeded Product
    const saRole = await db.role.findUnique({ where: { code: "SUPER_ADMIN" } });
    const admRole = await db.role.findUnique({ where: { code: "ADMIN" } });
    const mktRole = await db.role.findUnique({ where: { code: "MARKETING" } });
    const seededBpr = await db.bpr.findUnique({ where: { code: "BPR_KOTA_MADIUN" } });
    const seededProd = await db.product.findFirst({ where: { bpr: { code: "BPR_KOTA_MADIUN" } } });

    if (!saRole || !admRole || !mktRole || !seededBpr || !seededProd) {
      throw new Error("Required seed data not found");
    }

    seededBprId = seededBpr.id;
    seededProductId = seededProd.id;

    // 2. Create another BPR and Product to test scope isolation
    const otherBpr = await BprRepository.create({
      code: `BPR_PROD_${Date.now()}`,
      name: "BPR Product Scope Test",
    });
    otherBprId = otherBpr.id;
    testBprIds.push(otherBpr.id);

    const otherProd = await ProductRepository.create({
      bprId: otherBprId,
      code: `KREDIT_OTHER_${Date.now()}`,
      name: "Kredit Khusus Other BPR",
    });
    otherProductId = otherProd.id;
    testProductIds.push(otherProd.id);

    // 3. Create Test Users
    const sa = await UserRepository.create({
      username: `sa_prod_${Date.now()}`,
      password: "Password123!",
      fullName: "Super Admin Product Test",
      roleId: saRole.id,
      status: "ACTIVE",
    });
    superAdminId = sa.id;
    testUserIds.push(sa.id);
    superAdminToken = await signSessionToken({
      userId: sa.id,
      username: sa.username,
      fullName: sa.fullName,
      role: "SUPER_ADMIN",
    });

    const admMadiun = await UserRepository.create({
      username: `adm_prod_${Date.now()}`,
      password: "Password123!",
      fullName: "Admin Product Madiun",
      roleId: admRole.id,
      bprId: seededBprId,
      status: "ACTIVE",
    });
    adminMadiunId = admMadiun.id;
    testUserIds.push(admMadiun.id);
    adminMadiunToken = await signSessionToken({
      userId: admMadiun.id,
      username: admMadiun.username,
      fullName: admMadiun.fullName,
      role: "ADMIN",
      bprId: seededBprId,
    });

    const mkt = await UserRepository.create({
      username: `mkt_prod_${Date.now()}`,
      password: "Password123!",
      fullName: "Marketing Product Test",
      roleId: mktRole.id,
      bprId: seededBprId,
      status: "ACTIVE",
    });
    marketingId = mkt.id;
    testUserIds.push(mkt.id);
    marketingToken = await signSessionToken({
      userId: mkt.id,
      username: mkt.username,
      fullName: mkt.fullName,
      role: "MARKETING",
      bprId: seededBprId,
    });
  }, 45000);

  afterAll(async () => {
    if (testUserIds.length > 0) {
      await db.auditLog.deleteMany({ where: { userId: { in: testUserIds } } });
      await db.auditLog.deleteMany({ where: { entityId: { in: testUserIds } } });
      await db.user.deleteMany({ where: { id: { in: testUserIds } } });
    }
    if (testProductIds.length > 0) {
      await db.auditLog.deleteMany({ where: { entityId: { in: testProductIds } } });
      await db.product.deleteMany({ where: { id: { in: testProductIds } } });
    }
    if (testBprIds.length > 0) {
      await db.auditLog.deleteMany({ where: { entityId: { in: testBprIds } } });
      await db.bpr.deleteMany({ where: { id: { in: testBprIds } } });
    }
  }, 45000);

  describe("GET /api/v1/products (List Products)", () => {
    it("should list all products across BPRs for Super Admin", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/products", {
        method: "GET",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}` },
      });

      const res = await listProducts(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(2);
    }, 30000);

    it("should filter products by bprId when requested by Super Admin", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/products?bprId=${seededBprId}`,
        {
          method: "GET",
          headers: { cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}` },
        }
      );

      const res = await listProducts(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      for (const prod of body.data) {
        expect(prod.bprId).toBe(seededBprId);
      }
    }, 30000);

    it("should restrict Admin to products belonging to their assigned BPR", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/products", {
        method: "GET",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${adminMadiunToken}` },
      });

      const res = await listProducts(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      for (const prod of body.data) {
        expect(prod.bprId).toBe(seededBprId);
      }
    }, 30000);

    it("should reject Marketing with 403 Forbidden (Marketing lacks MASTER_VIEW)", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/products", {
        method: "GET",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${marketingToken}` },
      });

      const res = await listProducts(req);
      expect(res.status).toBe(403);
    }, 30000);
  });

  describe("POST /api/v1/products (Create Product)", () => {
    let newProductId: string;

    it("should allow Super Admin to create a product + record audit log", async () => {
      const prodCode = `KREDIT_TEST_${Date.now()}`;
      const req = new NextRequest("http://localhost:3000/api/v1/products", {
        method: "POST",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          bprId: seededBprId,
          code: prodCode,
          name: "Kredit Multiguna Test",
          description: "Produk kredit multiguna untuk testing",
        }),
      });

      const res = await createProduct(req);
      expect(res.status).toBe(201);

      const body = await res.json();
      expect(body.data.code).toBe(prodCode);
      expect(body.data.bprId).toBe(seededBprId);
      newProductId = body.data.id;
      testProductIds.push(newProductId);

      // Verify Audit Log
      const audit = await db.auditLog.findFirst({
        where: {
          entityId: newProductId,
          action: "PRODUCT_CREATE",
        },
      });
      expect(audit).not.toBeNull();
      expect(audit?.userId).toBe(superAdminId);
    }, 30000);

    it("should allow Admin to create product in their assigned BPR", async () => {
      const prodCode = `KREDIT_ADM_${Date.now()}`;
      const req = new NextRequest("http://localhost:3000/api/v1/products", {
        method: "POST",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${adminMadiunToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          bprId: seededBprId,
          code: prodCode,
          name: "Kredit Pensiun Admin",
        }),
      });

      const res = await createProduct(req);
      expect(res.status).toBe(201);

      const body = await res.json();
      testProductIds.push(body.data.id);
    }, 30000);

    it("SECURITY: should block Admin from creating product in another BPR (403)", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/products", {
        method: "POST",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${adminMadiunToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          bprId: otherBprId,
          code: "ILLEGAL_PROD",
          name: "Illegal Product",
        }),
      });

      const res = await createProduct(req);
      expect(res.status).toBe(403);
    }, 30000);

    it("should reject duplicate product code within same BPR with 409 Conflict", async () => {
      const seeded = await db.product.findUnique({ where: { id: seededProductId } });
      const req = new NextRequest("http://localhost:3000/api/v1/products", {
        method: "POST",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          bprId: seededBprId,
          code: seeded?.code || "KREDIT_KONSUMTIF",
          name: "Duplicate Product",
        }),
      });

      const res = await createProduct(req);
      expect(res.status).toBe(409);
    }, 30000);
  });

  describe("GET /api/v1/products/:id (Get Single Product)", () => {
    it("should return product details with child counts for authorized caller", async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/products/${seededProductId}`, {
        method: "GET",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${adminMadiunToken}` },
      });

      const res = await getProductById(req, {
        params: { id: seededProductId },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.id).toBe(seededProductId);
      expect(body.data.bpr).toBeDefined();
      expect(body.data._count).toBeDefined();
      expect(body.data._count.creditParameters).toBeGreaterThanOrEqual(1);
    }, 30000);

    it("SECURITY: should block Admin from viewing product in another BPR (403)", async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/products/${otherProductId}`, {
        method: "GET",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${adminMadiunToken}` },
      });

      const res = await getProductById(req, {
        params: { id: otherProductId },
      });

      expect(res.status).toBe(403);
    }, 30000);

    it("should return 404 for non-existent product", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const req = new NextRequest(`http://localhost:3000/api/v1/products/${fakeId}`, {
        method: "GET",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}` },
      });

      const res = await getProductById(req, {
        params: { id: fakeId },
      });

      expect(res.status).toBe(404);
    }, 30000);
  });

  describe("PATCH /api/v1/products/:id (Update Product)", () => {
    let productToUpdateId: string;

    beforeAll(async () => {
      const prod = await ProductRepository.create({
        bprId: seededBprId,
        code: `PROD_UPD_${Date.now()}`,
        name: "Product To Update",
      });
      productToUpdateId = prod.id;
      testProductIds.push(prod.id);
    }, 30000);

    it("should update product name, description, and status + record audit log", async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/products/${productToUpdateId}`, {
        method: "PATCH",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${adminMadiunToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: "Updated Product Name",
          description: "Updated description text",
          status: "INACTIVE",
        }),
      });

      const res = await updateProductById(req, {
        params: { id: productToUpdateId },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.name).toBe("Updated Product Name");
      expect(body.data.description).toBe("Updated description text");
      expect(body.data.status).toBe("INACTIVE");

      // Verify Audit Log
      const audit = await db.auditLog.findFirst({
        where: {
          entityId: productToUpdateId,
          action: "PRODUCT_UPDATE",
        },
      });
      expect(audit).not.toBeNull();
    }, 30000);

    it("SECURITY: should block Admin from updating product in another BPR (403)", async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/products/${otherProductId}`, {
        method: "PATCH",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${adminMadiunToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: "Hacked Product Name",
        }),
      });

      const res = await updateProductById(req, {
        params: { id: otherProductId },
      });

      expect(res.status).toBe(403);
    }, 30000);
  });

  describe("DELETE /api/v1/products/:id (Delete Product / Soft Delete)", () => {
    let productToDeleteId: string;

    beforeAll(async () => {
      const prod = await ProductRepository.create({
        bprId: seededBprId,
        code: `PROD_DEL_${Date.now()}`,
        name: "Product To Delete",
      });
      productToDeleteId = prod.id;
      testProductIds.push(prod.id);
    }, 30000);

    it("should soft delete product + record audit log (204 No Content)", async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/products/${productToDeleteId}`, {
        method: "DELETE",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}` },
      });

      const res = await deleteProductById(req, {
        params: { id: productToDeleteId },
      });

      expect(res.status).toBe(204);

      // Verify soft delete in DB
      const dbProduct = await db.product.findUnique({
        where: { id: productToDeleteId },
      });
      expect(dbProduct).not.toBeNull();
      expect(dbProduct?.deletedAt).not.toBeNull();
      expect(dbProduct?.status).toBe("INACTIVE");

      // Verify Audit Log
      const audit = await db.auditLog.findFirst({
        where: {
          entityId: productToDeleteId,
          action: "PRODUCT_DELETE",
        },
      });
      expect(audit).not.toBeNull();
    }, 30000);
  });
});
