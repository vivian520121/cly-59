import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Gallery',
    component: () => import('@/views/GalleryView.vue'),
    meta: { title: '标本陈列墙' },
  },
  {
    path: '/specimen/new',
    name: 'SpecimenNew',
    component: () => import('@/views/SpecimenEdit.vue'),
    meta: { title: '新建标本' },
  },
  {
    path: '/specimen/:id',
    name: 'SpecimenEdit',
    component: () => import('@/views/SpecimenEdit.vue'),
    meta: { title: '编辑标本' },
    props: true,
  },
  {
    path: '/album/export',
    name: 'AlbumExport',
    component: () => import('@/views/AlbumExport.vue'),
    meta: { title: '收藏册导出' },
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach((to, _from, next) => {
  document.title = to.meta.title ? `${to.meta.title} - 复古植物标本收藏` : '复古植物标本收藏'
  next()
})

export default router
