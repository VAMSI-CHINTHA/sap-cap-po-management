vamsi@Mac po-management % curl -i -X POST \
  'http://localhost:4004/odata/v4/purchase/PurchaseOrders' \
  -H 'Content-Type: application/json' \
  -d '{
    "poNumber": "PO-TEST-MAT-001",
    "supplier_ID": "8ed8c241-a387-4fcc-bc2f-f6935ccee03a",
    "companyCode_ID": "06ee4070-b07c-48a9-8087-7c18b70d239a",
    "purchasingOrganization_ID": "eecb1f99-9fe9-4ddc-a23a-726ecfc508d9",
    "purchasingGroup_ID": "7cac04f1-e350-473a-9fc7-dbfd4251d894",
    "documentDate": "2026-10-19",
    "currency": "INR",
    "status": "Draft"
  }'
HTTP/1.1 201 Created
X-Correlation-ID: 256f4e6a-d028-478e-9936-7c4dad8651b1
OData-Version: 4.0
location: PurchaseOrders(84ea758e-d1e2-4838-96bd-a374e3a7ae30)
Content-Type: application/json; charset=utf-8
Content-Length: 718
Date: Mon, 19 Oct 2026 16:44:44 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"@odata.context":"$metadata#PurchaseOrders/$entity","ID":"84ea758e-d1e2-4838-96bd-a374e3a7ae30","note":null,"status":"Draft","currency":"INR","poNumber":"PO-TEST-MAT-001","createdAt":"2026-10-19T16:44:44.866Z","createdBy":"anonymous","incoterms":null,"reference":null,"modifiedAt":"2026-10-19T16:44:44.866Z","modifiedBy":"anonymous","supplier_ID":"8ed8c241-a387-4fcc-bc2f-f6935ccee03a","totalAmount":null,"deliveryDate":null,"documentDate":"2026-10-19","paymentTerms":null,"companyCode_ID":"06ee4070-b07c-48a9-8087-7c18b70d239a","purchaseOrderType":"NB","goodsReceiptStatus":"Not Received","purchasingGroup_ID":"7cac04f1-e350-473a-9fc7-dbfd4251d894","purchasingOrganization_ID":"eecb1f99-9fe9-4ddc-a23a-726ecfc508d9"}%                                                             
vamsi@Mac po-management % curl -i -X POST \
  'http://localhost:4004/odata/v4/purchase/PurchaseOrderItems' \
  -H 'Content-Type: application/json' \
  -d '{
    "purchaseOrder_ID": "84ea758e-d1e2-4838-96bd-a374e3a7ae30",
    "material_ID": "bef92ab1-94d4-4525-80a7-6e9462052e04",
    "description": "Business Laptop",
    "quantity": 2,
    "unit": "EA",
    "unitPrice": 65000
  }'
HTTP/1.1 201 Created
X-Correlation-ID: f21510a5-9d6f-4a5a-9056-9487b0f0940a
OData-Version: 4.0
location: PurchaseOrderItems(39dd3844-4b21-4c6c-b5ec-c04e6fcd50bf)
Content-Type: application/json; charset=utf-8
Content-Length: 322
Date: Mon, 19 Oct 2026 16:47:01 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"@odata.context":"$metadata#PurchaseOrderItems/$entity","ID":"39dd3844-4b21-4c6c-b5ec-c04e6fcd50bf","unit":"EA","quantity":"2.000","lineTotal":"130000.00","unitPrice":"65000.00","description":"Business Laptop","material_ID":"bef92ab1-94d4-4525-80a7-6e9462052e04","purchaseOrder_ID":"84ea758e-d1e2-4838-96bd-a374e3a7ae30"}%                                                                   
vamsi@Mac po-management % curl -i -X POST \
  'http://localhost:4004/odata/v4/purchase/PurchaseOrderItems' \
  -H 'Content-Type: application/json' \
  -d '{
    "purchaseOrder_ID": "84ea758e-d1e2-4838-96bd-a374e3a7ae30",
    "material_ID": "1c1f1f86-a8a5-48f4-8889-cb93c62c8e51",
    "description": "Wireless Keyboard",
    "quantity": 1,
    "unit": "EA",
    "unitPrice": 1500
  }'
HTTP/1.1 400 Bad Request
X-Correlation-ID: 5bdbf6e9-b2f0-4d53-b5dd-50fe540d3205
OData-Version: 4.0
Content-Type: application/json; charset=utf-8
Content-Length: 124
Date: Mon, 19 Oct 2026 16:54:14 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"error":{"message":"Supplier is not authorized to provide the selected material","code":"400","@Common.numericSeverity":4}}%     
vamsi@Mac po-management % curl -i -X POST \
  'http://localhost:4004/odata/v4/purchase/PurchaseOrderItems' \
  -H 'Content-Type: application/json' \
  -d '{
    "purchaseOrder_ID": "84ea758e-d1e2-4838-96bd-a374e3a7ae30",
    "material_ID": "bef92ab1-94d4-4525-80a7-6e9462052e04",
    "description": "Business Laptop",
    "quantity": 0,
    "unit": "EA",
    "unitPrice": 65000
  }'
HTTP/1.1 400 Bad Request
X-Correlation-ID: 6af698a6-d1e4-47f7-9f5f-3b1bce3d648b
OData-Version: 4.0
Content-Type: application/json; charset=utf-8
Content-Length: 99
Date: Mon, 19 Oct 2026 16:55:22 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"error":{"message":"Quantity must be greater than zero","code":"400","@Common.numericSeverity":4}}%                              
vamsi@Mac po-management % curl -i -X POST \
  'http://localhost:4004/odata/v4/purchase/PurchaseOrderItems' \
  -H 'Content-Type: application/json' \
  -d '{
    "purchaseOrder_ID": "84ea758e-d1e2-4838-96bd-a374e3a7ae30",
    "material_ID": "bef92ab1-94d4-4525-80a7-6e9462052e04",
    "description": "Business Laptop",
    "quantity": 1,
    "unit": "EA",
    "unitPrice": -100
  }'
HTTP/1.1 400 Bad Request
X-Correlation-ID: 3727c9a6-5a1f-4001-92ff-72edfad5bd63
OData-Version: 4.0
Content-Type: application/json; charset=utf-8
Content-Length: 94
Date: Mon, 19 Oct 2026 16:55:56 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"error":{"message":"Unit price cannot be negative","code":"400","@Common.numericSeverity":4}}%                                   
vamsi@Mac po-management % curl -i -X PATCH \
  'http://localhost:4004/odata/v4/purchase/PurchaseOrderItems(39dd3844-4b21-4c6c-b5ec-c04e6fcd50bf)' \
  -H 'Content-Type: application/json' \
  -d '{
    "quantity": 3
  }'
HTTP/1.1 200 OK
X-Correlation-ID: cb7bee54-5eaf-4c6d-82c7-2db13c37b8f7
OData-Version: 4.0
Content-Type: application/json; charset=utf-8
Content-Length: 322
Date: Mon, 19 Oct 2026 16:57:01 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"@odata.context":"$metadata#PurchaseOrderItems/$entity","ID":"39dd3844-4b21-4c6c-b5ec-c04e6fcd50bf","unit":"EA","quantity":"3.000","lineTotal":"195000.00","unitPrice":"65000.00","description":"Business Laptop","material_ID":"bef92ab1-94d4-4525-80a7-6e9462052e04","purchaseOrder_ID":"84ea758e-d1e2-4838-96bd-a374e3a7ae30"}%                                                                   
vamsi@Mac po-management % curl -i \
  'http://localhost:4004/odata/v4/purchase/PurchaseOrders(84ea758e-d1e2-4838-96bd-a374e3a7ae30)'
HTTP/1.1 200 OK
X-Correlation-ID: 44e1803f-bdf8-4d51-83b6-f9e578993c23
OData-Version: 4.0
Content-Type: application/json; charset=utf-8
Content-Length: 725
Date: Mon, 19 Oct 2026 16:58:42 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"@odata.context":"$metadata#PurchaseOrders/$entity","ID":"84ea758e-d1e2-4838-96bd-a374e3a7ae30","note":null,"status":"Draft","currency":"INR","poNumber":"PO-TEST-MAT-001","createdAt":"2026-10-19T16:44:44.866Z","createdBy":"anonymous","incoterms":null,"reference":null,"modifiedAt":"2026-10-19T16:57:01.513Z","modifiedBy":"anonymous","supplier_ID":"8ed8c241-a387-4fcc-bc2f-f6935ccee03a","totalAmount":"195000.00","deliveryDate":null,"documentDate":"2026-10-19","paymentTerms":null,"companyCode_ID":"06ee4070-b07c-48a9-8087-7c18b70d239a","purchaseOrderType":"NB","goodsReceiptStatus":"Not Received","purchasingGroup_ID":"7cac04f1-e350-473a-9fc7-dbfd4251d894","purchasingOrganization_ID":"eecb1f99-9fe9-4ddc-a23a-726ecfc508d9"}%                                                      
vamsi@Mac po-management % curl -i -X PATCH \
  'http://localhost:4004/odata/v4/purchase/PurchaseOrderItems(39dd3844-4b21-4c6c-b5ec-c04e6fcd50bf)' \
  -H 'Content-Type: application/json' \
  -d '{
    "material_ID": "1c1f1f86-a8a5-48f4-8889-cb93c62c8e51"
  }'
HTTP/1.1 400 Bad Request
X-Correlation-ID: 7867670a-f955-432f-8bee-396345f17afe
OData-Version: 4.0
Content-Type: application/json; charset=utf-8
Content-Length: 124
Date: Mon, 19 Oct 2026 17:04:22 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"error":{"message":"Supplier is not authorized to provide the selected material","code":"400","@Common.numericSeverity":4}}%     
vamsi@Mac po-management % curl -i -X POST \
  'http://localhost:4004/odata/v4/purchase/PurchaseOrderItems' \
  -H 'Content-Type: application/json' \
  -d '{
    "purchaseOrder_ID": "84ea758e-d1e2-4838-96bd-a374e3a7ae30",
    "material_ID": "bef92ab1-94d4-4525-80a7-6e9462052e04",
    "description": "Business Laptop - Item 2",
    "quantity": 1,
    "unit": "EA",
    "unitPrice": 65000
  }'
HTTP/1.1 201 Created
X-Correlation-ID: d111dc70-b6bb-4926-b5f4-ef912e876556
OData-Version: 4.0
location: PurchaseOrderItems(459441fc-4685-45cf-b496-de9df4817d26)
Content-Type: application/json; charset=utf-8
Content-Length: 330
Date: Mon, 19 Oct 2026 17:11:44 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"@odata.context":"$metadata#PurchaseOrderItems/$entity","ID":"459441fc-4685-45cf-b496-de9df4817d26","unit":"EA","quantity":"1.000","lineTotal":"65000.00","unitPrice":"65000.00","description":"Business Laptop - Item 2","material_ID":"bef92ab1-94d4-4525-80a7-6e9462052e04","purchaseOrder_ID":"84ea758e-d1e2-4838-96bd-a374e3a7ae30"}%                                                           
vamsi@Mac po-management % curl -i -X POST \
  'http://localhost:4004/odata/v4/purchase/PurchaseOrderItems' \
  -H 'Content-Type: application/json' \
  -d '{
    "purchaseOrder_ID": "84ea758e-d1e2-4838-96bd-a374e3a7ae30",
    "material_ID": "0d6866f0-e2b4-40a7-8037-f5a8644b1310",
    "description": "Business Monitor - Item 3",
    "quantity": 2,
    "unit": "EA",
    "unitPrice": 15000
  }'
HTTP/1.1 400 Bad Request
X-Correlation-ID: 07759b7b-9850-4f0a-9b31-4734688e2c60
OData-Version: 4.0
Content-Type: application/json; charset=utf-8
Content-Length: 124
Date: Mon, 19 Oct 2026 17:12:23 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"error":{"message":"Supplier is not authorized to provide the selected material","code":"400","@Common.numericSeverity":4}}%     
vamsi@Mac po-management % curl -s \
  'http://localhost:4004/odata/v4/purchase/PurchaseOrders(84ea758e-d1e2-4838-96bd-a374e3a7ae30)'
{"@odata.context":"$metadata#PurchaseOrders/$entity","ID":"84ea758e-d1e2-4838-96bd-a374e3a7ae30","note":null,"status":"Draft","currency":"INR","poNumber":"PO-TEST-MAT-001","createdAt":"2026-10-19T16:44:44.866Z","createdBy":"anonymous","incoterms":null,"reference":null,"modifiedAt":"2026-10-19T17:11:44.289Z","modifiedBy":"anonymous","supplier_ID":"8ed8c241-a387-4fcc-bc2f-f6935ccee03a","totalAmount":"260000.00","deliveryDate":null,"documentDate":"2026-10-19","paymentTerms":null,"companyCode_ID":"06ee4070-b07c-48a9-8087-7c18b70d239a","purchaseOrderType":"NB","goodsReceiptStatus":"Not Received","purchasingGroup_ID":"7cac04f1-e350-473a-9fc7-dbfd4251d894","purchasingOrganization_ID":"eecb1f99-9fe9-4ddc-a23a-726ecfc508d9"}%                                                      
vamsi@Mac po-management % curl -i -X DELETE \
  'http://localhost:4004/odata/v4/purchase/PurchaseOrderItems(459441fc-4685-45cf-b496-de9df4817d26)'
HTTP/1.1 204 No Content
X-Correlation-ID: a8a6bc03-5c87-4806-b67c-62f18fa398bd
OData-Version: 4.0
Date: Mon, 19 Oct 2026 17:15:34 GMT
Connection: keep-alive
Keep-Alive: timeout=5

vamsi@Mac po-management % curl -s \          
  'http://localhost:4004/odata/v4/purchase/PurchaseOrders(84ea758e-d1e2-4838-96bd-a374e3a7ae30)'    
{"@odata.context":"$metadata#PurchaseOrders/$entity","ID":"84ea758e-d1e2-4838-96bd-a374e3a7ae30","note":null,"status":"Draft","currency":"INR","poNumber":"PO-TEST-MAT-001","createdAt":"2026-10-19T16:44:44.866Z","createdBy":"anonymous","incoterms":null,"reference":null,"modifiedAt":"2026-10-19T17:15:34.461Z","modifiedBy":"anonymous","supplier_ID":"8ed8c241-a387-4fcc-bc2f-f6935ccee03a","totalAmount":"195000.00","deliveryDate":null,"documentDate":"2026-10-19","paymentTerms":null,"companyCode_ID":"06ee4070-b07c-48a9-8087-7c18b70d239a","purchaseOrderType":"NB","goodsReceiptStatus":"Not Received","purchasingGroup_ID":"7cac04f1-e350-473a-9fc7-dbfd4251d894","purchasingOrganization_ID":"eecb1f99-9fe9-4ddc-a23a-726ecfc508d9"}%                                                      
vamsi@Mac po-management % git status
On branch main
Your branch is up to date with 'origin/main'.

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
        modified:   srv/purchase-service.js

no changes added to commit (use "git add" and/or "git commit -a")
vamsi@Mac po-management % 