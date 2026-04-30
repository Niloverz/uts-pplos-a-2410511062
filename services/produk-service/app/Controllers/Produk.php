<?php

namespace App\Controllers;

use CodeIgniter\RESTful\ResourceController;
use App\Models\ProdukModel;

class Produk extends ResourceController
{
    protected $modelName = ProdukModel::class;
    protected $format = 'json';

    // GET /produk (dengan paging & filtering)
    public function index()
    {
        $page = $this->request->getVar('page') ?? 1;
        $perPage = $this->request->getVar('per_page') ?? 10;
        $search = $this->request->getVar('search');

        $query = $this->model;

        if ($search) {
            $query = $query->like('nama_produk', $search);
        }

        $data = $query->paginate($perPage, 'default', $page);

        return $this->respond([
            'status' => 200,
            'data' => $data,
            'pager' => $this->model->pager->getDetails()
        ]);
    }

    // GET /produk/{id}
    public function show($id = null)
    {
        $data = $this->model->find($id);
        if (!$data) {
            return $this->failNotFound('Produk tidak ditemukan');
        }
        return $this->respond($data);
    }

    // POST /produk
    public function create()
    {
        $rules = [
            'nama_produk' => 'required|min_length[3]',
            'harga' => 'required|numeric|greater_than[0]',
            'stok' => 'permit_empty|numeric'
        ];

        if (!$this->validate($rules)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        $data = [
            'nama_produk' => $this->request->getVar('nama_produk'),
            'harga' => $this->request->getVar('harga'),
            'stok' => $this->request->getVar('stok') ?? 0,
            'deskripsi' => $this->request->getVar('deskripsi')
        ];

        $this->model->save($data);
        return $this->respondCreated(['message' => 'Produk berhasil ditambahkan', 'id' => $this->model->getInsertID()]);
    }

    // PUT /produk/{id}
    public function update($id = null)
    {
        $data = $this->request->getRawInput();
        if (!$this->model->find($id)) {
            return $this->failNotFound('Produk tidak ditemukan');
        }

        $this->model->update($id, $data);
        return $this->respond(['message' => 'Produk berhasil diupdate']);
    }

    // DELETE /produk/{id}
    public function delete($id = null)
    {
        if (!$this->model->find($id)) {
            return $this->failNotFound('Produk tidak ditemukan');
        }

        $this->model->delete($id);
        return $this->respondDeleted(['message' => 'Produk berhasil dihapus']);
    }
}