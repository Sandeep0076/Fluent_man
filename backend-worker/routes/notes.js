import { Hono } from 'hono'
import { getSupabaseClient } from '../supabase.js'

const router = new Hono()

/**
 * GET /api/notes/categories
 * Get all note categories
 */
router.get('/categories', async (c) => {
    try {
        const supabase = getSupabaseClient(c.env);
        const { data: categories, error } = await supabase
            .from('note_categories')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;

        return c.json({
            success: true,
            data: categories || []
        });
    } catch (error) {
        console.error('Error fetching note categories:', error);
        return c.json({
            success: false,
            error: 'Failed to fetch note categories'
        }, 500);
    }
});

/**
 * POST /api/notes/categories
 * Add a new note category
 */
router.post('/categories', async (c) => {
    try {
        const supabase = getSupabaseClient(c.env);
        const { name } = await c.req.json();
        if (!name || name.trim().length === 0) {
            return c.json({ success: false, error: 'Category name is required' }, 400);
        }

        const { data: category, error } = await supabase
            .from('note_categories')
            .insert({ name: name.trim() })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') { // Unique constraint
                return c.json({ success: false, error: 'Category already exists' }, 409);
            }
            throw error;
        }

        return c.json({
            success: true,
            data: category
        }, 201);
    } catch (error) {
        console.error('Error adding note category:', error);
        return c.json({
            success: false,
            error: 'Failed to add note category'
        }, 500);
    }
});

/**
 * DELETE /api/notes/categories/:id
 * Delete a note category (sets notes' category_id to NULL)
 */
router.delete('/categories/:id', async (c) => {
    try {
        const supabase = getSupabaseClient(c.env);
        const id = c.req.param('id');

        // First, set category_id to NULL for all notes in this category
        await supabase
            .from('notes')
            .update({ category_id: null })
            .eq('category_id', id);

        // Then delete the category
        const { error } = await supabase
            .from('note_categories')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return c.json({
            success: true,
            message: 'Category deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting note category:', error);
        return c.json({
            success: false,
            error: 'Failed to delete note category'
        }, 500);
    }
});

/**
 * GET /api/notes
 */
router.get('/', async (c) => {
    try {
        console.log('[DEBUG] GET /notes endpoint called');
        const supabase = getSupabaseClient(c.env);
        const sort = c.req.query('sort') || 'newest';
        const category_id = c.req.query('category_id');
        console.log('[DEBUG] Sort parameter:', sort);
        console.log('[DEBUG] Category filter:', category_id);
        
        let query = supabase.from('notes').select('*');

        // Add category filter
        if (category_id && category_id !== 'all') {
            query = query.eq('category_id', category_id);
        }

        if (sort === 'az') {
            query = query.order('title', { ascending: true });
        } else if (sort === 'za') {
            query = query.order('title', { ascending: false });
        } else if (sort === 'oldest') {
            query = query.order('created_at', { ascending: true });
        } else {
            query = query.order('created_at', { ascending: false });
        }

        console.log('[DEBUG] Executing query to fetch notes...');
        const { data: notes, error } = await query;
        if (error) {
            console.error('[DEBUG] Supabase query error:', error);
            throw error;
        }

        console.log('[DEBUG] Notes fetched successfully:', {
            count: notes ? notes.length : 0,
            notes: notes?.map(n => ({ id: n.id, title: n.title, created_at: n.created_at }))
        });

        return c.json({
            success: true,
            data: notes || [],
            count: notes ? notes.length : 0
        });
    } catch (error) {
        console.error('[ERROR] Error fetching notes:', error);
        console.error('[ERROR] Error code:', error.code);
        console.error('[ERROR] Error message:', error.message);
        console.error('[ERROR] Error details:', error.details);
        return c.json({
            success: false,
            error: 'Failed to fetch notes',
            details: error.message
        }, 500);
    }
});

/**
 * GET /api/notes/:id
 */
router.get('/:id', async (c) => {
    try {
        const supabase = getSupabaseClient(c.env);
        const id = c.req.param('id')
        const { data: note, error } = await supabase
            .from('notes')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return c.json({ success: false, error: 'Note not found' }, 404);
            }
            throw error;
        }

        return c.json({ success: true, data: note });
    } catch (error) {
        console.error('Error fetching note:', error);
        return c.json({ success: false, error: 'Failed to fetch note' }, 500);
    }
});

/**
 * POST /api/notes
 */
router.post('/', async (c) => {
    try {
        console.log('[DEBUG] POST /notes endpoint called');
        const supabase = getSupabaseClient(c.env);
        console.log('[DEBUG] Supabase client created successfully');
        
        const body = await c.req.json();
        console.log('[DEBUG] Request body received:', body);
        
        const { title, content, category_id } = body;
        if (!title || !content) {
            console.log('[DEBUG] Missing title or content:', { title: !!title, content: !!content });
            return c.json({ success: false, error: 'Both title and content are required' }, 400);
        }

        const insertData = {
            title: title.trim(),
            content: content.trim()
        };
        
        if (category_id) {
            insertData.category_id = category_id;
        }

        console.log('[DEBUG] Attempting to insert note:', insertData);
        const { data: newNote, error } = await supabase
            .from('notes')
            .insert(insertData)
            .select()
            .single();

        if (error) {
            console.error('[DEBUG] Supabase insert error:', error);
            throw error;
        }

        console.log('[DEBUG] Note created successfully:', newNote);
        return c.json({ success: true, data: newNote }, 201);
    } catch (error) {
        console.error('[ERROR] Error creating note:', error);
        console.error('[ERROR] Error code:', error.code);
        console.error('[ERROR] Error message:', error.message);
        console.error('[ERROR] Error details:', error.details);
        return c.json({ success: false, error: 'Failed to create note', details: error.message }, 500);
    }
});

/**
 * PUT /api/notes/:id
 */
router.put('/:id', async (c) => {
    try {
        const supabase = getSupabaseClient(c.env);
        const id = c.req.param('id')
        const { title, content, category_id } = await c.req.json();
        if (!title || !content) {
            return c.json({ success: false, error: 'Both title and content are required' }, 400);
        }

        const updateData = {
            title: title.trim(),
            content: content.trim()
        };
        
        if (category_id !== undefined) {
            updateData.category_id = category_id;
        }

        const { data: updatedNote, error } = await supabase
            .from('notes')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return c.json({ success: false, error: 'Note not found' }, 404);
            }
            throw error;
        }

        return c.json({ success: true, data: updatedNote });
    } catch (error) {
        console.error('Error updating note:', error);
        return c.json({ success: false, error: 'Failed to update note' }, 500);
    }
});

/**
 * DELETE /api/notes/:id
 */
router.delete('/:id', async (c) => {
    try {
        const supabase = getSupabaseClient(c.env);
        const id = c.req.param('id')
        const { error } = await supabase.from('notes').delete().eq('id', id);
        if (error) throw error;
        return c.json({ success: true, message: 'Note deleted successfully' });
    } catch (error) {
        console.error('Error deleting note:', error);
        return c.json({ success: false, error: 'Failed to delete note' }, 500);
    }
});

export default router
