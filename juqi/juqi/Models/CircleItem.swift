//
//  CircleItem.swift
//  juqi
//
//  发现页电站列表项模型，从 appGetCircleList 的 list 项解码。命名避与 SwiftUI.Circle 冲突。
//

import Foundation

struct CircleItem: Identifiable, Codable, Hashable {
    let id: String
    let title: String
    /// 简介（按接口返回解析）
    let desc: String?
    /// 小图/封面（按接口返回解析）
    let imageSmall: String?

    // MARK: - 电站详情页字段（appGetCircleDetail 返回，列表接口无）
    /// 大图/横幅封面
    let banner: String?
    /// 横幅跳转链接
    let bannerLink: String?
    /// 电量（帖子与电量之和）
    let chargeNums: Int?
    /// 加入人数
    let followCircleNums: Int?
    /// 成员称呼（如「橘友」）
    let nickName: String?
    /// 加入需审核
    let isJoinCheck: Bool?
    /// 仅限成员发帖
    let isMemberPublic: Bool?
    /// 是否树洞/匿名电站（发到这里的内容不会出现在首页和个人主页）
    let isSecret: Bool?
    /// 投稿需审核
    let isPublickCheck: Bool?
    /// 话题列表
    let topic: [String]?
    /// 是否有排行榜
    let rankListStatus: Bool?

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case circleId
        case title
        case name
        case desc
        case imageSmall
        case banner
        case bannerLink
        case chargeNums
        case followCircleNums
        case nickName
        case isJoinCheck
        case isMemberPublic
        case isSecret
        case isPublickCheck
        case topic
        case rankListStatus
    }

    init(id: String, title: String, desc: String? = nil, imageSmall: String? = nil,
         banner: String? = nil, bannerLink: String? = nil, chargeNums: Int? = nil,
         followCircleNums: Int? = nil, nickName: String? = nil, isJoinCheck: Bool? = nil,
         isMemberPublic: Bool? = nil, isSecret: Bool? = nil, isPublickCheck: Bool? = nil,
         topic: [String]? = nil, rankListStatus: Bool? = nil) {
        self.id = id
        self.title = title
        self.desc = desc
        self.imageSmall = imageSmall
        self.banner = banner
        self.bannerLink = bannerLink
        self.chargeNums = chargeNums
        self.followCircleNums = followCircleNums
        self.nickName = nickName
        self.isJoinCheck = isJoinCheck
        self.isMemberPublic = isMemberPublic
        self.isSecret = isSecret
        self.isPublickCheck = isPublickCheck
        self.topic = topic
        self.rankListStatus = rankListStatus
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = Self.decodeId(from: c) ?? ""
        title = Self.decodeStringIfPresent(from: c, forKey: .title)
            ?? Self.decodeStringIfPresent(from: c, forKey: .name)
            ?? ""
        desc = Self.decodeStringIfPresent(from: c, forKey: .desc)
        imageSmall = Self.decodeStringIfPresent(from: c, forKey: .imageSmall)
        banner = Self.decodeStringIfPresent(from: c, forKey: .banner)
        bannerLink = Self.decodeStringIfPresent(from: c, forKey: .bannerLink)
        chargeNums = Self.decodeIntIfPresent(from: c, forKey: .chargeNums)
        followCircleNums = Self.decodeIntIfPresent(from: c, forKey: .followCircleNums)
        nickName = Self.decodeStringIfPresent(from: c, forKey: .nickName)
        isJoinCheck = Self.decodeBoolIfPresent(from: c, forKey: .isJoinCheck)
        isMemberPublic = Self.decodeBoolIfPresent(from: c, forKey: .isMemberPublic)
        isSecret = Self.decodeBoolIfPresent(from: c, forKey: .isSecret)
        isPublickCheck = Self.decodeBoolIfPresent(from: c, forKey: .isPublickCheck)
        topic = Self.decodeTopicIfPresent(from: c, forKey: .topic)
        rankListStatus = Self.decodeBoolIfPresent(from: c, forKey: .rankListStatus)
    }

    /// String：兼容服务端返回字符串或数字（部分电站接口返回格式不一致）
    private static func decodeStringIfPresent(from c: KeyedDecodingContainer<CodingKeys>, forKey key: CodingKeys) -> String? {
        if let s = try? c.decodeIfPresent(String.self, forKey: key), !s.isEmpty { return s }
        if let n = try? c.decodeIfPresent(Int.self, forKey: key) { return "\(n)" }
        if let n = try? c.decodeIfPresent(Double.self, forKey: key) { return "\(n)" }
        if let b = try? c.decodeIfPresent(Bool.self, forKey: key) { return b ? "true" : "false" }
        return nil
    }

    /// Int：兼容服务端返回数字或字符串（部分电站接口返回格式不一致）
    private static func decodeIntIfPresent(from c: KeyedDecodingContainer<CodingKeys>, forKey key: CodingKeys) -> Int? {
        if let n = try? c.decodeIfPresent(Int.self, forKey: key) { return n }
        if let s = try? c.decodeIfPresent(String.self, forKey: key), let n = Int(s) { return n }
        return nil
    }

    /// Bool：兼容服务端返回 true/false 或 0/1
    private static func decodeBoolIfPresent(from c: KeyedDecodingContainer<CodingKeys>, forKey key: CodingKeys) -> Bool? {
        if let b = try? c.decodeIfPresent(Bool.self, forKey: key) { return b }
        if let n = try? c.decodeIfPresent(Int.self, forKey: key) { return n != 0 }
        if let s = try? c.decodeIfPresent(String.self, forKey: key) { return s != "0" && s.lowercased() != "false" }
        return nil
    }

    /// 话题列表：兼容 [String] 或 [{ name/topic/title: String }]（部分电站接口格式不一致）
    private static func decodeTopicIfPresent(from c: KeyedDecodingContainer<CodingKeys>, forKey key: CodingKeys) -> [String]? {
        if let arr = try? c.decodeIfPresent([String].self, forKey: key), !arr.isEmpty { return arr }
        guard let arr = try? c.decodeIfPresent([TopicEntry].self, forKey: key) else { return nil }
        let names = arr.compactMap { $0.name ?? $0.topic ?? $0.title }
        return names.isEmpty ? nil : names
    }

    /// 从容器解析 id：支持 String、数字、或对象 { "$oid": "xxx" } / { "oid": "xxx" }（部分电站格式不一致）
    private static func decodeId(from c: KeyedDecodingContainer<CodingKeys>) -> String? {
        if let s = try? c.decodeIfPresent(String.self, forKey: .id), !s.isEmpty { return s }
        if let s = try? c.decodeIfPresent(String.self, forKey: .circleId), !s.isEmpty { return s }
        if let n = try? c.decodeIfPresent(Int.self, forKey: .id) { return "\(n)" }
        if let n = try? c.decodeIfPresent(Int.self, forKey: .circleId) { return "\(n)" }
        if let n = try? c.decodeIfPresent(Double.self, forKey: .id) { return "\(Int(n))" }
        if let n = try? c.decodeIfPresent(Double.self, forKey: .circleId) { return "\(Int(n))" }
        if let obj = try? c.decodeIfPresent([String: String].self, forKey: .id),
           let oid = obj["$oid"] ?? obj["oid"], !oid.isEmpty { return oid }
        return nil
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(id, forKey: .id)
        try c.encode(title, forKey: .title)
        try c.encodeIfPresent(desc, forKey: .desc)
        try c.encodeIfPresent(imageSmall, forKey: .imageSmall)
        try c.encodeIfPresent(banner, forKey: .banner)
        try c.encodeIfPresent(bannerLink, forKey: .bannerLink)
        try c.encodeIfPresent(chargeNums, forKey: .chargeNums)
        try c.encodeIfPresent(followCircleNums, forKey: .followCircleNums)
        try c.encodeIfPresent(nickName, forKey: .nickName)
        try c.encodeIfPresent(isJoinCheck, forKey: .isJoinCheck)
        try c.encodeIfPresent(isMemberPublic, forKey: .isMemberPublic)
        try c.encodeIfPresent(isSecret, forKey: .isSecret)
        try c.encodeIfPresent(isPublickCheck, forKey: .isPublickCheck)
        try c.encodeIfPresent(topic, forKey: .topic)
        try c.encodeIfPresent(rankListStatus, forKey: .rankListStatus)
    }
}

/// 话题项：兼容服务端返回字符串数组或对象数组（字段可能为字符串或数字）
private struct TopicEntry: Decodable {
    let name: String?
    let topic: String?
    let title: String?

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        name = Self.decodeStringIfPresent(from: c, forKey: .name)
        topic = Self.decodeStringIfPresent(from: c, forKey: .topic)
        title = Self.decodeStringIfPresent(from: c, forKey: .title)
    }

    private enum CodingKeys: String, CodingKey { case name, topic, title }

    private static func decodeStringIfPresent(from c: KeyedDecodingContainer<CodingKeys>, forKey key: CodingKeys) -> String? {
        if let s = try? c.decodeIfPresent(String.self, forKey: key), !s.isEmpty { return s }
        if let n = try? c.decodeIfPresent(Int.self, forKey: key) { return "\(n)" }
        if let n = try? c.decodeIfPresent(Double.self, forKey: key) { return "\(n)" }
        return nil
    }
}

struct CircleListResponse: Codable {
    let list: [CircleItem]

    init(list: [CircleItem]) {
        self.list = list
    }

    init(from decoder: Decoder) throws {
        // 兼容 1) data 直接为数组 [...]  2) data 为 { list: [...] }  3) list 为 null/缺失 视为空数组
        if let arr = try? [CircleItem](from: decoder) {
            list = arr
            return
        }
        let c = try decoder.container(keyedBy: CodingKeys.self)
        list = (try c.decodeIfPresent([CircleItem].self, forKey: .list)) ?? []
    }

    enum CodingKeys: String, CodingKey {
        case list
    }
}
