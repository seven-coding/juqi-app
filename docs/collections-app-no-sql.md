# App 使用的 NoSQL 集合清单

测试环境需与线上对齐的云开发 NoSQL 集合列表，供脚本「集合补全 + 空集合测试数据」使用。

| 集合名 | 用途简述 |
|--------|----------|
| user | 用户信息、登录、详情、搜索、消息 |
| dyn | 动态列表/详情、发布、转发、话题、圈子 |
| dynComments | 评论列表、发表/删除评论 |
| dynCommentReplay | 评论回复 |
| dynFavorite | 收藏动态 |
| user_followee | 关注关系、粉丝/关注数 |
| user_black | 拉黑关系、黑名单 |
| user_no_see | 不看她/不让她看我的（getDynsListV201、setUser、getUserAbout） |
| blackList | 评论/转发前黑名单校验 |
| topics | 话题、搜索、发布、setTopic、getTopic |
| circle | 圈子信息、getCircleDetail lookup、消息、publishDyn |
| circle_follow | 圈子关注、加入圈子、publishDyn |
| circle_apply_join | 申请加入圈子、sendNormalDyn、sendSecretDyns |
| messagesOther | 站内消息（评论/点赞等）、未读数 |
| messagesType | 消息类型、getMessagesNew、publishDyn/messages |
| messagesUser | 会话用户、getMessagesNew、publishDyn/messages |
| messageChat | getTopic 消息会话 |
| chatIds | 会话 ID（私信） |
| log_admin | 管理日志、setTopic、getCircleDetail |
| user_secret | getDynDetail lookup（头像挂件、VIP 等） |
| shopBP | 背包/金币（getUserAbout） |
| shopLog | 消费流水、publishDyn、getTradeInfo |
| inviteCodes | 邀请码（sendInviteCode） |
| userGeo | 附近的人（getNearPeople） |
| message | 消息（兼容） |
| message_visit | 访问消息（兼容） |
| trial_periods | 试用期（兼容） |

**缺失集合（代码引用但测试环境可能没有）**：  
user_no_see, user_black, circle, circle_follow, circle_apply_join, log_admin, messagesType, messagesUser, messageChat, shopLog, chatIds, user_secret, shopBP, inviteCodes, userGeo

**常为空需补测试数据的集合**：  
blackList, dynFavorite, message, message_visit, messagesOther, trial_periods

脚本见：`cloudfunctions/scripts/seed-test-collections.js`，使用说明见该目录下 README。
