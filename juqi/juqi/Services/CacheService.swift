//
//  CacheService.swift
//  juqi
//
//  Created by Tong Yao on 2026/1/12.
//

import Foundation

/// 缓存服务，用于管理接口响应缓存、图片缓存和用户信息缓存
class CacheService {
    static let shared = CacheService()
    
    private let cacheDirectory: URL
    private let imageCacheDirectory: URL
    private let userCacheDirectory: URL
    private let responseCache = NSCache<NSString, CachedResponse>()
    private let maxCacheAge: TimeInterval = 5 * 60 // 5分钟
    
    private init() {
        // 创建缓存目录
        let cachesURL = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first!
        cacheDirectory = cachesURL.appendingPathComponent("APIResponseCache")
        imageCacheDirectory = cachesURL.appendingPathComponent("ImageCache")
        userCacheDirectory = cachesURL.appendingPathComponent("UserCache")
        
        // 创建目录
        try? FileManager.default.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)
        try? FileManager.default.createDirectory(at: imageCacheDirectory, withIntermediateDirectories: true)
        try? FileManager.default.createDirectory(at: userCacheDirectory, withIntermediateDirectories: true)
        
        // 配置内存缓存
        responseCache.countLimit = 100
        responseCache.totalCostLimit = 10 * 1024 * 1024 // 10MB
    }
    
    // MARK: - 接口响应缓存
    
    /// 缓存接口响应
    func cacheResponse<T: Codable>(_ response: T, for key: String, maxAge: TimeInterval? = nil) {
        let cacheKey = NSString(string: key)
        
        // 将响应编码为JSON数据
        guard let encoded = try? JSONEncoder().encode(response) else { return }
        
        let cached = CachedResponse(
            data: encoded,
            timestamp: Date(),
            maxAge: maxAge ?? maxCacheAge
        )
        responseCache.setObject(cached, forKey: cacheKey)
        
        // 同时保存到磁盘
        saveToDisk(cached, key: key)
    }
    
    /// 获取缓存的接口响应
    func getCachedResponse<T: Codable>(_ type: T.Type, for key: String) -> T? {
        let cacheKey = NSString(string: key)
        
        var cachedData: Data?
        
        // 先从内存缓存获取
        if let cached = responseCache.object(forKey: cacheKey) {
            if !cached.isExpired {
                cachedData = cached.data
            } else {
                responseCache.removeObject(forKey: cacheKey)
            }
        }
        
        // 从磁盘加载
        if cachedData == nil {
            if let cached = loadFromDisk(key: key), !cached.isExpired {
                responseCache.setObject(cached, forKey: cacheKey)
                cachedData = cached.data
            }
        }
        
        // 解码数据（与 NetworkService 一致：API 返回的 publishTime 为秒级时间戳）
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .secondsSince1970
        guard let data = cachedData,
              let decoded = try? decoder.decode(T.self, from: data) else {
            return nil
        }
        
        return decoded
    }
    
    /// 清除接口响应缓存
    func clearResponseCache(for key: String? = nil) {
        if let key = key {
            let cacheKey = NSString(string: key)
            responseCache.removeObject(forKey: cacheKey)
            deleteFromDisk(key: key)
        } else {
            responseCache.removeAllObjects()
            clearDiskCache()
        }
    }
    
    // MARK: - 图片缓存
    
    /// 缓存图片
    func cacheImage(_ image: UIImage, for url: String) {
        guard let data = image.jpegData(compressionQuality: 0.8) else { return }
        let fileName = url.md5 + ".jpg"
        let fileURL = imageCacheDirectory.appendingPathComponent(fileName)
        try? data.write(to: fileURL)
    }
    
    /// 获取缓存的图片
    func getCachedImage(for url: String) -> UIImage? {
        let fileName = url.md5 + ".jpg"
        let fileURL = imageCacheDirectory.appendingPathComponent(fileName)
        guard let data = try? Data(contentsOf: fileURL) else { return nil }
        return UIImage(data: data)
    }
    
    /// 清除图片缓存
    func clearImageCache() {
        try? FileManager.default.removeItem(at: imageCacheDirectory)
        try? FileManager.default.createDirectory(at: imageCacheDirectory, withIntermediateDirectories: true)
    }
    
    // MARK: - 用户信息缓存
    
    /// 缓存用户信息
    func cacheUserInfo(_ userInfo: [String: Any], for userId: String) {
        let fileName = userId + ".json"
        let fileURL = userCacheDirectory.appendingPathComponent(fileName)
        if let data = try? JSONSerialization.data(withJSONObject: userInfo) {
            try? data.write(to: fileURL)
        }
    }
    
    /// 获取缓存的用户信息
    func getCachedUserInfo(for userId: String) -> [String: Any]? {
        let fileName = userId + ".json"
        let fileURL = userCacheDirectory.appendingPathComponent(fileName)
        guard let data = try? Data(contentsOf: fileURL),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            return nil
        }
        return json
    }
    
    /// 清除用户信息缓存
    func clearUserCache(for userId: String? = nil) {
        if let userId = userId {
            let fileName = userId + ".json"
            let fileURL = userCacheDirectory.appendingPathComponent(fileName)
            try? FileManager.default.removeItem(at: fileURL)
        } else {
            try? FileManager.default.removeItem(at: userCacheDirectory)
            try? FileManager.default.createDirectory(at: userCacheDirectory, withIntermediateDirectories: true)
        }
    }
    
    // MARK: - 私有方法
    
    private func saveToDisk(_ cached: CachedResponse, key: String) {
        let fileName = key.md5 + ".cache"
        let fileURL = cacheDirectory.appendingPathComponent(fileName)
        if let data = try? JSONEncoder().encode(cached) {
            try? data.write(to: fileURL)
        }
    }
    
    private func loadFromDisk(key: String) -> CachedResponse? {
        let fileName = key.md5 + ".cache"
        let fileURL = cacheDirectory.appendingPathComponent(fileName)
        guard let data = try? Data(contentsOf: fileURL) else { return nil }
        return try? JSONDecoder().decode(CachedResponse.self, from: data)
    }
    
    private func deleteFromDisk(key: String) {
        let fileName = key.md5 + ".cache"
        let fileURL = cacheDirectory.appendingPathComponent(fileName)
        try? FileManager.default.removeItem(at: fileURL)
    }
    
    private func clearDiskCache() {
        try? FileManager.default.removeItem(at: cacheDirectory)
        try? FileManager.default.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)
    }
}

// MARK: - 缓存响应模型

private class CachedResponse: NSObject, Codable {
    let data: Data
    let timestamp: Date
    let maxAge: TimeInterval
    
    var isExpired: Bool {
        Date().timeIntervalSince(timestamp) > maxAge
    }
    
    init(data: Data, timestamp: Date, maxAge: TimeInterval) {
        self.data = data
        self.timestamp = timestamp
        self.maxAge = maxAge
    }
}

// MARK: - String扩展（MD5）

import CryptoKit

private extension String {
    var md5: String {
        guard let data = self.data(using: .utf8) else { return self }
        let hash = Insecure.MD5.hash(data: data)
        return hash.map { String(format: "%02x", $0) }.joined()
    }
}
