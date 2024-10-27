package main

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// Task 模型
type Task struct {
	ID                uint      `json:"id" gorm:"primarykey"`
	Title             string    `json:"title" gorm:"not null"`
	Description       string    `json:"description"`
	Completed         bool      `json:"completed" gorm:"default:false"`
	Pomodoros         int       `json:"pomodoros" gorm:"default:0"`
	EstimatedPomodoros int      `json:"estimatedPomodoros" gorm:"default:1"`
	CreatedAt         time.Time `json:"createdAt"`
	UpdatedAt         time.Time `json:"updatedAt"`
}

// 全局数据库连接
var db *gorm.DB

// 初始化数据库
func initDB() error {
	var err error
	db, err = gorm.Open(sqlite.Open("pomodoro.db"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return fmt.Errorf("连接数据库失败: %v", err)
	}

	// 自动迁移数据库表结构
	if err := db.AutoMigrate(&Task{}); err != nil {
		return fmt.Errorf("数据库迁移失败: %v", err)
	}

	return nil
}

// API处理函数
func getTasks(c *gin.Context) {
	var tasks []Task
	result := db.Order("created_at desc").Find(&tasks)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取任务列表失败"})
		return
	}
	c.JSON(http.StatusOK, tasks)
}

func createTask(c *gin.Context) {
	var task Task
	if err := c.ShouldBindJSON(&task); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的请求数据"})
		return
	}

	result := db.Create(&task)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建任务失败"})
		return
	}

	c.JSON(http.StatusCreated, task)
}

func updateTask(c *gin.Context) {
	var task Task
	if err := db.First(&task, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "任务不存在"})
		return
	}

	var updates Task
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的请求数据"})
		return
	}

	if err := db.Model(&task).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "更新任务失败"})
		return
	}

	// 重新获取更新后的任务
	db.First(&task, task.ID)
	c.JSON(http.StatusOK, task)
}

func deleteTask(c *gin.Context) {
	result := db.Delete(&Task{}, c.Param("id"))
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "删除任务失败"})
		return
	}

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "任务不存在"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "任务已删除"})
}

func getStats(c *gin.Context) {
	var stats struct {
		TotalPomodoros     int64 `json:"totalPomodoros"`
		CompletedTasks     int64 `json:"completedTasks"`
		TotalTasks         int64 `json:"totalTasks"`
		RemainingPomodoros int64 `json:"remainingPomodoros"`
	}

	var total, completed int64
	db.Model(&Task{}).Count(&total)
	db.Model(&Task{}).Where("completed = ?", true).Count(&completed)
	
	stats.TotalTasks = total
	stats.CompletedTasks = completed

	var totalPomodoros int64
	db.Model(&Task{}).Select("COALESCE(SUM(pomodoros), 0)").Scan(&totalPomodoros)
	stats.TotalPomodoros = totalPomodoros

	var estimatedTotal int64
	db.Model(&Task{}).
		Where("completed = ?", false).
		Select("COALESCE(SUM(estimated_pomodoros), 0)").
		Scan(&estimatedTotal)

	stats.RemainingPomodoros = estimatedTotal - stats.TotalPomodoros

	c.JSON(http.StatusOK, stats)
}

func setupRouter() *gin.Engine {
	r := gin.Default()

	// CORS配置
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept"},
		AllowCredentials: true,
	}))

	// API路由
	api := r.Group("/api")
	{
		tasks := api.Group("/tasks")
		{
			tasks.GET("", getTasks)
			tasks.POST("", createTask)
			tasks.PATCH("/:id", updateTask)
			tasks.DELETE("/:id", deleteTask)
		}

		api.GET("/stats", getStats)
	}

	return r
}

func main() {
	// 初始化数据库
	if err := initDB(); err != nil {
		log.Fatalf("初始化失败: %v", err)
	}

	// 创建并启动服务器
	r := setupRouter()
	if err := r.Run(":3000"); err != nil {
		log.Fatalf("服务器启动失败: %v", err)
	}
}
